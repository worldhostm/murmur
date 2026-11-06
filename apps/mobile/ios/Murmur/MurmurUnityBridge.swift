import Foundation
import React

/// Unity 쪽으로 메시지를 보내는 통로. Unity as a Library를 임베드하기 전까지는 로그 프록시를 쓴다.
///
/// Unity 임베드 후 (ADR 0001):
///   1. Unity가 내보낸 `UnityFramework.framework`를 앱에 링크한다.
///   2. 앱 시작 시 `UnityFrameworkLoad()`로 프레임워크를 로드하고 `runEmbedded`로 띄운다.
///   3. `UnityFrameworkProxy` 구현에서 `ufw.sendMessageToGO(withName:functionName:message:)`로 전달한다.
/// Unity 쪽 수신 GameObject 이름과 메서드는 apps/avatar-unity/Assets/Murmur/Scripts/MurmurBridge.cs와 맞춘다.
protocol UnityFrameworkProxy: AnyObject {
    func sendMessage(gameObject: String, method: String, message: String)
}

final class LoggingUnityProxy: UnityFrameworkProxy {
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

    var proxy: UnityFrameworkProxy = LoggingUnityProxy()
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

    @objc func dispose(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        MurmurUnityBridge.shared.dispose()
        resolve(nil)
    }
}
