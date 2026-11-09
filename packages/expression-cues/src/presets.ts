import { blendShapeIndex, neutralFrame } from '@murmur/face-protocol';
import type { BlendShapeName, FaceFrame } from '@murmur/face-protocol';
import type { SpriteExpression } from './expressions';

type Preset = Partial<Record<BlendShapeName, number>>;

/**
 * 표정 → ARKit 블렌드셰이프 프리셋. 값은 Unity `SpriteExpressionClassifier` 규칙을 통과하면 같은 칸이 나오도록 골랐다
 * (test/presets.test.ts 가 라운드트립을 검사한다). 좌우 대칭.
 */
const PRESETS: Record<SpriteExpression, Preset> = {
  neutral: {},
  softSmile: { mouthSmileLeft: 0.2, mouthSmileRight: 0.2 },
  smile: {
    mouthSmileLeft: 0.45,
    mouthSmileRight: 0.45,
    cheekSquintLeft: 0.2,
    cheekSquintRight: 0.2,
  },
  bigSmile: {
    mouthSmileLeft: 0.85,
    mouthSmileRight: 0.85,
    jawOpen: 0.3,
    cheekSquintLeft: 0.4,
    cheekSquintRight: 0.4,
  },
  serious: { eyeSquintLeft: 0.5, eyeSquintRight: 0.5, browDownLeft: 0.35, browDownRight: 0.35 },
  surprised: {
    jawOpen: 0.6,
    eyeWideLeft: 0.7,
    eyeWideRight: 0.7,
    browInnerUp: 0.4,
    browOuterUpLeft: 0.5,
    browOuterUpRight: 0.5,
  },
  flustered: { jawOpen: 0.4, browInnerUp: 0.2, eyeLookDownLeft: 0.3, eyeLookDownRight: 0.3 },
  worried: { browInnerUp: 0.45, mouthPressLeft: 0.3, mouthPressRight: 0.3 },
  sad: {
    mouthFrownLeft: 0.6,
    mouthFrownRight: 0.6,
    browInnerUp: 0.6,
    eyeLookDownLeft: 0.4,
    eyeLookDownRight: 0.4,
  },
  angry: {
    browDownLeft: 0.8,
    browDownRight: 0.8,
    mouthFrownLeft: 0.3,
    mouthFrownRight: 0.3,
    noseSneerLeft: 0.3,
    noseSneerRight: 0.3,
  },
};

/** 표정 하나를 face-protocol 프레임으로. 머리 포즈는 중립(`neutralFrame`). */
export function frameForExpression(expression: SpriteExpression, timestampMs = 0): FaceFrame {
  const frame = neutralFrame(timestampMs);
  const shapes = frame.blendShapes;
  for (const [name, value] of Object.entries(PRESETS[expression]) as [BlendShapeName, number][]) {
    shapes[blendShapeIndex(name)] = value;
  }
  return frame;
}
