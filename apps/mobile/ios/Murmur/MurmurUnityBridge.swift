import Foundation
import MachO
import React
import UIKit

/// Unity 쪽으로 메시지를 보내는 통로 (ADR 0001).
/// `UnityFramework.framework`가 앱 번들에 있으면 `DynamicUnityProxy`가 런타임에 로드해서 쓰고, 없으면 `LoggingUnityProxy`.
/// `import UnityFramework` 없이 ObjC 런타임으로 호출하므로 프레임워크가 없는 빌드(CI, 시뮬레이터 arm64)도 컴파일된다.
/// 프레임워크는 `pnpm unity:framework:ios` 가 만들고 Podfile 이 `MurmurUnity` pod 으로 자동 포함한다.
/// Unity 쪽 수신 GameObject 이름과 메서드는 apps/avatar-unity/Assets/Murmur/Scripts/MurmurBridge.cs와 맞춘다.
protocol UnityFrameworkProxy: AnyObject {
    var isAvailable: Bool { get }
    func sendMessage(gameObject: String, method: String, message: String)
}

/// Unity as a Library 를 ObjC 런타임으로 구동한다. 선택자는 UnityFramework.h 의 것과 같다:
///   +getInstance, -setExecuteHeader:, -setDataBundleId:, -runEmbeddedWithArgc:argv:appLaunchOpts:,
///   -sendMessageToGOWithName:functionName:message:, -appController, -pause:, -showUnityWindow
final class DynamicUnityProxy: UnityFrameworkProxy {
    static let shared = DynamicUnityProxy()

    private let frameworkPath = Bundle.main.bundlePath + "/Frameworks/UnityFramework.framework"
    private var framework: NSObject?
    private(set) var isRunning = false

    var isAvailable: Bool { FileManager.default.fileExists(atPath: frameworkPath) }

    private typealias CStr = UnsafePointer<CChar>
    private typealias SetCStr = @convention(c) (AnyObject, Selector, CStr) -> Void
    private typealias SendMsg = @convention(c) (AnyObject, Selector, CStr, CStr, CStr) -> Void
    private typealias RunEmbedded = @convention(c) (AnyObject, Selector, Int32, UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>, NSDictionary?) -> Void
    private typealias SetHeader = @convention(c) (AnyObject, Selector, UnsafeRawPointer) -> Void
    private typealias SetBool = @convention(c) (AnyObject, Selector, Bool) -> Void

    private func imp<T>(_ obj: NSObject, _ name: String, _ type: T.Type) -> (T, Selector)? {
        let sel = NSSelectorFromString(name)
        guard obj.responds(to: sel), let m = obj.method(for: sel) else { return nil }
        return (unsafeBitCast(m, to: type), sel)
    }

    /// 프레임워크를 로드하고 인스턴스를 얻는다. 아직 실행하지는 않는다.
    private func load() -> NSObject? {
        if let f = framework { return f }
        guard isAvailable, let bundle = Bundle(path: frameworkPath) else { return nil }
        if !bundle.isLoaded { bundle.load() }
        guard let cls = bundle.principalClass as? NSObject.Type else {
            NSLog("[MurmurUnity] principalClass 를 찾지 못했다")
            return nil
        }
        guard let ufw = cls.perform(NSSelectorFromString("getInstance"))?.takeUnretainedValue() as? NSObject else { return nil }
        framework = ufw
        return ufw
    }

    /// Unity 를 임베드 모드로 실행한다 (메인 스레드). 이미 실행 중이면 no-op.
    @discardableResult
    func runIfNeeded() -> Bool {
        if isRunning { return true }
        guard Thread.isMainThread else {
            var ok = false
            DispatchQueue.main.sync { ok = self.runIfNeeded() }
            return ok
        }
        guard let ufw = load() else { return false }
        if ufw.perform(NSSelectorFromString("appController"))?.takeUnretainedValue() == nil,
           let (setHeader, sel) = imp(ufw, "setExecuteHeader:", SetHeader.self) {
            // _mh_execute_header 는 Xcode 의 debug dylib 분리 때문에 링크되지 않을 수 있다. 메인 실행 파일(image 0) 헤더를 dyld 에서 얻는다.
            if let header = _dyld_get_image_header(0) { setHeader(ufw, sel, UnsafeRawPointer(header)) }
        }
        // Data 폴더는 scripts/unity-build-ios-framework.sh 가 프레임워크 안으로 복사한다.
        if let (setBundle, sel) = imp(ufw, "setDataBundleId:", SetCStr.self) {
            "com.unity3d.framework".withCString { setBundle(ufw, sel, $0) }
        }
        guard let (run, runSel) = imp(ufw, "runEmbeddedWithArgc:argv:appLaunchOpts:", RunEmbedded.self) else { return false }
        run(ufw, runSel, CommandLine.argc, CommandLine.unsafeArgv, nil)
        isRunning = true
        NSLog("[MurmurUnity] UnityFramework running (embedded)")
        return true
    }

    /// Unity 의 루트 뷰 (appController.rootView). 실행 전이면 nil.
    var rootView: UIView? {
        guard let ufw = framework,
              let controller = ufw.perform(NSSelectorFromString("appController"))?.takeUnretainedValue() as? NSObject else { return nil }
        return controller.value(forKey: "rootView") as? UIView
    }

    func pause(_ paused: Bool) {
        guard isRunning, let ufw = framework, let (pause, sel) = imp(ufw, "pause:", SetBool.self) else { return }
        pause(ufw, sel, paused)
    }

    func sendMessage(gameObject: String, method: String, message: String) {
        guard isRunning, let ufw = framework,
              let (send, sel) = imp(ufw, "sendMessageToGOWithName:functionName:message:", SendMsg.self) else { return }
        gameObject.withCString { go in method.withCString { fn in message.withCString { msg in send(ufw, sel, go, fn, msg) } } }
    }
}

final class LoggingUnityProxy: UnityFrameworkProxy {
    var isAvailable: Bool { false }
    func sendMessage(gameObject: String, method: String, message: String) {
        #if DEBUG
        // 프레임은 30Hz로 오므로 OnFaceFrame은 길이만 찍는다.
        if method == MurmurUnityBridge.methodOnFaceFrame {
            NSLog("[MurmurUnity] %@.%@ (%ld chars)", gameObject, method, message.count)
        } else {
            NSLog("[MurmurUnity] %@.%@ %@", gameObject, method, message)
        }
        #endif
    }
}

/// Swift 싱글턴. 트래커가 direct-to-unity 모드일 때 JS를 거치지 않고 바로 프레임을 넘긴다.
final class MurmurUnityBridge {
    static let shared = MurmurUnityBridge()

    static let gameObject = "MurmurBridge"
    static let methodOnFaceFrame = "OnFaceFrame"
    static let methodLoadAvatar = "LoadAvatar"
    static let methodSetTheme = "SetTheme"
    static let methodSetMotion = "SetMotion"

    /// 프레임워크가 번들에 있으면 동적 프록시, 없으면 로그.
    var proxy: UnityFrameworkProxy = DynamicUnityProxy.shared.isAvailable ? DynamicUnityProxy.shared : LoggingUnityProxy()
    private(set) var loadedSlots = Set<String>()
    private let lock = NSLock()

    private init() {}

    func loadAvatar(slot: String, assetKey: String) {
        lock.lock(); loadedSlots.insert(slot); lock.unlock()
        proxy.sendMessage(gameObject: Self.gameObject, method: Self.methodLoadAvatar, message: "\(slot)|\(assetKey)")
    }

    /// `data`는 face-protocol 144바이트 프레임. base64로 감싸 "<slot>|<base64>"로 보낸다.
    func pushFrame(slot: String, data: Data) {
        pushFrame(slot: slot, base64: data.base64EncodedString())
    }

    func pushFrame(slot: String, base64: String) {
        proxy.sendMessage(gameObject: Self.gameObject, method: Self.methodOnFaceFrame, message: "\(slot)|\(base64)")
    }

    func setTheme(_ theme: String) {
        proxy.sendMessage(gameObject: Self.gameObject, method: Self.methodSetTheme, message: theme)
    }

    /// OS "동작 줄이기": "reduced" | "full".
    func setMotion(_ motion: String) {
        proxy.sendMessage(gameObject: Self.gameObject, method: Self.methodSetMotion, message: motion)
    }

    func dispose() {
        lock.lock(); loadedSlots.removeAll(); lock.unlock()
    }
}

/// React Native 모듈 `MurmurUnity`. apps/mobile/src/avatar/UnityAvatarRenderer.ts가 호출한다.
@objc(MurmurUnity)
final class MurmurUnity: NSObject {
    @objc static func requiresMainQueueSetup() -> Bool { true }

    @objc func loadAvatar(_ slot: String, assetKey: String,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {
        MurmurUnityBridge.shared.loadAvatar(slot: slot, assetKey: assetKey)
        resolve(nil)
    }

    @objc func pushFrame(_ slot: String, base64: String) {
        MurmurUnityBridge.shared.pushFrame(slot: slot, base64: base64)
    }

    @objc func setTheme(_ theme: String) {
        MurmurUnityBridge.shared.setTheme(theme)
    }

    @objc func setMotion(_ motion: String) {
        MurmurUnityBridge.shared.setMotion(motion)
    }

    @objc func dispose(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        MurmurUnityBridge.shared.dispose()
        resolve(nil)
    }
}

/// 통화 화면의 아바타 렌더 영역. JS `<UnityView />` ↔ 네이티브 이름 `MurmurUnityView` (클래스명에서 Manager 를 뺀 것).
/// 프레임워크가 있으면 Unity 를 실행하고 rootView 를 이 컨테이너에 넣는다. 없으면 빈 뷰(JS 가 자리 표시를 그린다).
@objc(MurmurUnityViewManager)
final class MurmurUnityViewManager: RCTViewManager {
    override static func requiresMainQueueSetup() -> Bool { true }

    override func view() -> UIView! {
        return MurmurUnityContainerView()
    }
}

final class MurmurUnityContainerView: UIView {
    private let proxy = DynamicUnityProxy.shared

    override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil {
            attachUnity()
            proxy.pause(false)
        } else {
            proxy.pause(true)
        }
    }

    private func attachUnity() {
        guard proxy.isAvailable, proxy.runIfNeeded(), let root = proxy.rootView else { return }
        if root.superview === self { return }
        root.removeFromSuperview()
        root.frame = bounds
        root.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        insertSubview(root, at: 0)
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        proxy.rootView?.frame = bounds
    }
}
