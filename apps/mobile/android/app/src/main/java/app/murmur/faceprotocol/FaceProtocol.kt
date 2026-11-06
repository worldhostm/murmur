// GENERATED FROM schema/face-frame.schema.json — DO NOT EDIT
// Regenerate: pnpm --filter @murmur/face-protocol generate
package app.murmur.faceprotocol

object FaceProtocol {
    const val VERSION: Int = 1
    const val BLEND_SHAPE_COUNT: Int = 52
    const val FRAME_BYTE_LENGTH: Int = 144
    val MAGIC: ByteArray = byteArrayOf(0x4D, 0x46) // "MF"

    /**
     * MediaPipe Face Landmarker의 faceBlendshapes 카테고리는 index 0에 "_neutral"을 먼저 내고,
     * 그 뒤 52개가 ARKit과 같은 camelCase 이름·순서로 온다. 따라서 category index = ordinal + 1.
     */
    const val MEDIAPIPE_INDEX_OFFSET: Int = 1
}

enum class TrackingState(val code: Int) {
    TRACKED(0),
    LIMITED(1),
    LOST(2),
}

/** ARKit ARFaceAnchor.BlendShapeLocation 순서와 동일한 정규 순서. */
enum class BlendShape(val mediaPipeName: String) {
    EyeBlinkLeft("eyeBlinkLeft"),
    EyeLookDownLeft("eyeLookDownLeft"),
    EyeLookInLeft("eyeLookInLeft"),
    EyeLookOutLeft("eyeLookOutLeft"),
    EyeLookUpLeft("eyeLookUpLeft"),
    EyeSquintLeft("eyeSquintLeft"),
    EyeWideLeft("eyeWideLeft"),
    EyeBlinkRight("eyeBlinkRight"),
    EyeLookDownRight("eyeLookDownRight"),
    EyeLookInRight("eyeLookInRight"),
    EyeLookOutRight("eyeLookOutRight"),
    EyeLookUpRight("eyeLookUpRight"),
    EyeSquintRight("eyeSquintRight"),
    EyeWideRight("eyeWideRight"),
    JawForward("jawForward"),
    JawLeft("jawLeft"),
    JawRight("jawRight"),
    JawOpen("jawOpen"),
    MouthClose("mouthClose"),
    MouthFunnel("mouthFunnel"),
    MouthPucker("mouthPucker"),
    MouthLeft("mouthLeft"),
    MouthRight("mouthRight"),
    MouthSmileLeft("mouthSmileLeft"),
    MouthSmileRight("mouthSmileRight"),
    MouthFrownLeft("mouthFrownLeft"),
    MouthFrownRight("mouthFrownRight"),
    MouthDimpleLeft("mouthDimpleLeft"),
    MouthDimpleRight("mouthDimpleRight"),
    MouthStretchLeft("mouthStretchLeft"),
    MouthStretchRight("mouthStretchRight"),
    MouthRollLower("mouthRollLower"),
    MouthRollUpper("mouthRollUpper"),
    MouthShrugLower("mouthShrugLower"),
    MouthShrugUpper("mouthShrugUpper"),
    MouthPressLeft("mouthPressLeft"),
    MouthPressRight("mouthPressRight"),
    MouthLowerDownLeft("mouthLowerDownLeft"),
    MouthLowerDownRight("mouthLowerDownRight"),
    MouthUpperUpLeft("mouthUpperUpLeft"),
    MouthUpperUpRight("mouthUpperUpRight"),
    BrowDownLeft("browDownLeft"),
    BrowDownRight("browDownRight"),
    BrowInnerUp("browInnerUp"),
    BrowOuterUpLeft("browOuterUpLeft"),
    BrowOuterUpRight("browOuterUpRight"),
    CheekPuff("cheekPuff"),
    CheekSquintLeft("cheekSquintLeft"),
    CheekSquintRight("cheekSquintRight"),
    NoseSneerLeft("noseSneerLeft"),
    NoseSneerRight("noseSneerRight"),
    TongueOut("tongueOut"),
    ;

    /** MediaPipe faceBlendshapes 카테고리 배열에서의 index. */
    val mediaPipeIndex: Int get() = ordinal + FaceProtocol.MEDIAPIPE_INDEX_OFFSET
}
