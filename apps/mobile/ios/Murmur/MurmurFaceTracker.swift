import ARKit
import AVFoundation
import Foundation
import React
import simd

/// ARKit 얼굴 트래커 (Face ID 기기 전용, PLANNING.md "지원 기기").
///
/// 금지 사항 (루트 CLAUDE.md): 원본 카메라 영상(ARFrame.capturedImage 등 픽셀 버퍼)은 절대 JS나
/// Unity로 넘기지 않는다. 이 모듈이 밖으로 내보내는 것은 face-protocol 144바이트 프레임뿐이다.
///
/// 이벤트
///   - "murmur.faceFrame"     { frame: base64, slot: "local" }   최대 30Hz
///   - "murmur.trackingState" { state: "tracked"|"limited"|"lost" }  상태가 바뀔 때만
/// direct-to-unity가 켜지면 faceFrame은 JS로 보내지 않고 MurmurUnityBridge로 바로 넘긴다.
@objc(MurmurFaceTracker)
final class MurmurFaceTracker: RCTEventEmitter, ARSessionDelegate {
    static let eventFaceFrame = "murmur.faceFrame"
    static let eventTrackingState = "murmur.trackingState"

    private let session = ARSession()
    private var startedAt: CFTimeInterval = 0
    private var lastEmitAt: CFTimeInterval = 0
    private var lastAnchorAt: CFTimeInterval = 0
    private var running = false
    private var directToUnity = false
    private var hasListeners = false
    private var lastState: TrackingState = .lost
    private var lostTimer: Timer?

    /// 30Hz 상한. ARKit은 60Hz로 올 수 있다.
    private let minInterval: CFTimeInterval = 1.0 / 30.0
    private let lostAfter: CFTimeInterval = 0.5

    private var blendBuffer = [Float](repeating: 0, count: FaceProtocol.blendShapeCount)

    override init() {
        super.init()
        session.delegate = self
    }

    override static func requiresMainQueueSetup() -> Bool { true }

    override func supportedEvents() -> [String]! {
        [Self.eventFaceFrame, Self.eventTrackingState]
    }

    override func startObserving() { hasListeners = true }
    override func stopObserving() { hasListeners = false }

    // MARK: - JS API

    @objc func isSupported(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(ARFaceTrackingConfiguration.isSupported)
    }

    @objc func setDirectToUnity(_ enabled: Bool) {
        directToUnity = enabled
    }

    @objc func start(_ resolve: @escaping RCTPromiseResolveBlock,
                     rejecter reject: @escaping RCTPromiseRejectBlock) {
        guard ARFaceTrackingConfiguration.isSupported else {
            reject("E_UNSUPPORTED", "이 기기는 얼굴 트래킹(Face ID)을 지원하지 않아요.", nil)
            return
        }
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            guard let self else { return }
            guard granted else {
                reject("E_CAMERA_DENIED", "카메라 권한이 없어요.", nil)
                return
            }
            DispatchQueue.main.async {
                let config = ARFaceTrackingConfiguration()
                config.maximumNumberOfTrackedFaces = 1
                config.isLightEstimationEnabled = false
                self.startedAt = CACurrentMediaTime()
                self.lastEmitAt = 0
                self.lastAnchorAt = self.startedAt
                self.lastState = .lost
                self.running = true
                self.session.run(config, options: [.resetTracking, .removeExistingAnchors])
                self.scheduleLostTimer()
                resolve(nil)
            }
        }
    }

    @objc func stop(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            self.running = false
            self.lostTimer?.invalidate()
            self.lostTimer = nil
            self.session.pause()
            resolve(nil)
        }
    }

    // MARK: - ARSessionDelegate

    func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
        guard running, let face = anchors.compactMap({ $0 as? ARFaceAnchor }).first else { return }
        let now = CACurrentMediaTime()
        lastAnchorAt = now
        if now - lastEmitAt < minInterval { return }
        lastEmitAt = now

        for shape in BlendShape.allCases {
            let key = ARFaceAnchor.BlendShapeLocation(rawValue: shape.arkitKey)
            blendBuffer[shape.rawValue] = face.blendShapes[key]?.floatValue ?? 0
        }

        // 머리 포즈: ARKit 카메라 공간(오른손 좌표계, +x 오른쪽, +y 위, +z 카메라 쪽/사용자 쪽)의 값을
        // 그대로 담는다. 프로토콜은 "카메라 기준 미터"만 정하므로 좌표계 변환(Unity의 왼손 좌표계 등)은
        // 수신 측 렌더러가 맡는다 (apps/avatar-unity HeadPoseDriver 참고).
        let t = face.transform
        let rotation = simd_quatf(t)
        let position = SIMD3<Float>(t.columns.3.x, t.columns.3.y, t.columns.3.z)
        let state: TrackingState = face.isTracked ? .tracked : .limited

        let data = FaceFrameEncoder.encode(
            timestampMs: (now - startedAt) * 1000,
            tracking: state,
            blendShapes: blendBuffer,
            rotation: rotation,
            position: position
        )

        if directToUnity {
            MurmurUnityBridge.shared.pushFrame(slot: "local", data: data)
        } else if hasListeners {
            sendEvent(withName: Self.eventFaceFrame, body: ["frame": data.base64EncodedString(), "slot": "local"])
        }
        emitStateIfChanged(state)
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        emitStateIfChanged(.lost)
    }

    func sessionWasInterrupted(_ session: ARSession) {
        emitStateIfChanged(.lost)
    }

    // MARK: - 상태

    private func scheduleLostTimer() {
        lostTimer?.invalidate()
        lostTimer = Timer.scheduledTimer(withTimeInterval: lostAfter / 2, repeats: true) { [weak self] _ in
            guard let self, self.running else { return }
            if CACurrentMediaTime() - self.lastAnchorAt > self.lostAfter {
                self.emitStateIfChanged(.lost)
            }
        }
    }

    private func emitStateIfChanged(_ state: TrackingState) {
        guard state != lastState else { return }
        lastState = state
        guard hasListeners else { return }
        let name: String
        switch state {
        case .tracked: name = "tracked"
        case .limited: name = "limited"
        case .lost: name = "lost"
        }
        sendEvent(withName: Self.eventTrackingState, body: ["state": name])
    }
}
