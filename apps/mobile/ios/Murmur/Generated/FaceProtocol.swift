// GENERATED FROM schema/face-frame.schema.json — DO NOT EDIT
// Regenerate: pnpm --filter @murmur/face-protocol generate
import Foundation

public enum FaceProtocol {
    public static let version: UInt8 = 1
    public static let blendShapeCount = 52
    public static let frameByteLength = 144
    public static let magic: [UInt8] = [0x4D, 0x46] // "MF"
}

public enum TrackingState: UInt8, CaseIterable {
    case tracked = 0
    case limited = 1
    case lost = 2
}

/// ARKit ARFaceAnchor.BlendShapeLocation 순서와 동일한 정규 순서.
public enum BlendShape: Int, CaseIterable {
    case eyeBlinkLeft = 0
    case eyeLookDownLeft = 1
    case eyeLookInLeft = 2
    case eyeLookOutLeft = 3
    case eyeLookUpLeft = 4
    case eyeSquintLeft = 5
    case eyeWideLeft = 6
    case eyeBlinkRight = 7
    case eyeLookDownRight = 8
    case eyeLookInRight = 9
    case eyeLookOutRight = 10
    case eyeLookUpRight = 11
    case eyeSquintRight = 12
    case eyeWideRight = 13
    case jawForward = 14
    case jawLeft = 15
    case jawRight = 16
    case jawOpen = 17
    case mouthClose = 18
    case mouthFunnel = 19
    case mouthPucker = 20
    case mouthLeft = 21
    case mouthRight = 22
    case mouthSmileLeft = 23
    case mouthSmileRight = 24
    case mouthFrownLeft = 25
    case mouthFrownRight = 26
    case mouthDimpleLeft = 27
    case mouthDimpleRight = 28
    case mouthStretchLeft = 29
    case mouthStretchRight = 30
    case mouthRollLower = 31
    case mouthRollUpper = 32
    case mouthShrugLower = 33
    case mouthShrugUpper = 34
    case mouthPressLeft = 35
    case mouthPressRight = 36
    case mouthLowerDownLeft = 37
    case mouthLowerDownRight = 38
    case mouthUpperUpLeft = 39
    case mouthUpperUpRight = 40
    case browDownLeft = 41
    case browDownRight = 42
    case browInnerUp = 43
    case browOuterUpLeft = 44
    case browOuterUpRight = 45
    case cheekPuff = 46
    case cheekSquintLeft = 47
    case cheekSquintRight = 48
    case noseSneerLeft = 49
    case noseSneerRight = 50
    case tongueOut = 51

    /// ARKit의 BlendShapeLocation raw value. 이름이 동일하다.
    public var arkitKey: String {
        switch self {
        case .eyeBlinkLeft: return "eyeBlinkLeft"
        case .eyeLookDownLeft: return "eyeLookDownLeft"
        case .eyeLookInLeft: return "eyeLookInLeft"
        case .eyeLookOutLeft: return "eyeLookOutLeft"
        case .eyeLookUpLeft: return "eyeLookUpLeft"
        case .eyeSquintLeft: return "eyeSquintLeft"
        case .eyeWideLeft: return "eyeWideLeft"
        case .eyeBlinkRight: return "eyeBlinkRight"
        case .eyeLookDownRight: return "eyeLookDownRight"
        case .eyeLookInRight: return "eyeLookInRight"
        case .eyeLookOutRight: return "eyeLookOutRight"
        case .eyeLookUpRight: return "eyeLookUpRight"
        case .eyeSquintRight: return "eyeSquintRight"
        case .eyeWideRight: return "eyeWideRight"
        case .jawForward: return "jawForward"
        case .jawLeft: return "jawLeft"
        case .jawRight: return "jawRight"
        case .jawOpen: return "jawOpen"
        case .mouthClose: return "mouthClose"
        case .mouthFunnel: return "mouthFunnel"
        case .mouthPucker: return "mouthPucker"
        case .mouthLeft: return "mouthLeft"
        case .mouthRight: return "mouthRight"
        case .mouthSmileLeft: return "mouthSmileLeft"
        case .mouthSmileRight: return "mouthSmileRight"
        case .mouthFrownLeft: return "mouthFrownLeft"
        case .mouthFrownRight: return "mouthFrownRight"
        case .mouthDimpleLeft: return "mouthDimpleLeft"
        case .mouthDimpleRight: return "mouthDimpleRight"
        case .mouthStretchLeft: return "mouthStretchLeft"
        case .mouthStretchRight: return "mouthStretchRight"
        case .mouthRollLower: return "mouthRollLower"
        case .mouthRollUpper: return "mouthRollUpper"
        case .mouthShrugLower: return "mouthShrugLower"
        case .mouthShrugUpper: return "mouthShrugUpper"
        case .mouthPressLeft: return "mouthPressLeft"
        case .mouthPressRight: return "mouthPressRight"
        case .mouthLowerDownLeft: return "mouthLowerDownLeft"
        case .mouthLowerDownRight: return "mouthLowerDownRight"
        case .mouthUpperUpLeft: return "mouthUpperUpLeft"
        case .mouthUpperUpRight: return "mouthUpperUpRight"
        case .browDownLeft: return "browDownLeft"
        case .browDownRight: return "browDownRight"
        case .browInnerUp: return "browInnerUp"
        case .browOuterUpLeft: return "browOuterUpLeft"
        case .browOuterUpRight: return "browOuterUpRight"
        case .cheekPuff: return "cheekPuff"
        case .cheekSquintLeft: return "cheekSquintLeft"
        case .cheekSquintRight: return "cheekSquintRight"
        case .noseSneerLeft: return "noseSneerLeft"
        case .noseSneerRight: return "noseSneerRight"
        case .tongueOut: return "tongueOut"
        }
    }
}
