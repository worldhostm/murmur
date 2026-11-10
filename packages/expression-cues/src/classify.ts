import { blendShapeIndex } from '@murmur/face-protocol';
import type { FaceFrame } from '@murmur/face-protocol';
import type { SpriteExpression } from './expressions';

/**
 * Unity `SpriteExpressionClassifier` (SpriteExpression.cs) 의 TS 포트.
 * 수치·우선순위를 그대로 옮겼다. Unity 쪽 규칙을 바꾸면 여기도 같이 바꾼다 (테스트가 프리셋 라운드트립으로 잡는다).
 */
export interface ExpressionFeatures {
  smile: number;
  frown: number;
  jaw: number;
  browDown: number;
  browInnerUp: number;
  eyeWide: number;
  eyeSquint: number;
}

export function featuresFromFrame(frame: FaceFrame): ExpressionFeatures {
  const b = (name: Parameters<typeof blendShapeIndex>[0]): number =>
    frame.blendShapes[blendShapeIndex(name)] ?? 0;
  return {
    smile: (b('mouthSmileLeft') + b('mouthSmileRight')) * 0.5,
    frown: (b('mouthFrownLeft') + b('mouthFrownRight')) * 0.5,
    jaw: b('jawOpen'),
    browDown: (b('browDownLeft') + b('browDownRight')) * 0.5,
    browInnerUp: b('browInnerUp'),
    eyeWide: (b('eyeWideLeft') + b('eyeWideRight')) * 0.5,
    eyeSquint: (b('eyeSquintLeft') + b('eyeSquintRight')) * 0.5,
  };
}

export function classifyFeatures(x: ExpressionFeatures, lost = false): SpriteExpression {
  if (lost) return 'neutral';
  if (x.browDown > 0.45 && x.smile < 0.25) return 'angry';
  if (x.smile > 0.55 || (x.smile > 0.35 && x.jaw > 0.25)) return 'bigSmile';
  if (x.jaw > 0.3 && (x.eyeWide > 0.3 || x.browInnerUp > 0.45)) return 'surprised';
  if (x.frown > 0.3 || (x.browInnerUp > 0.5 && x.jaw < 0.15 && x.smile < 0.1)) return 'sad';
  if (x.smile > 0.3) return 'smile';
  if (x.browInnerUp > 0.3) return 'worried';
  if (x.jaw > 0.25) return 'flustered';
  if (x.eyeSquint > 0.35 || x.browDown > 0.25) return 'serious';
  if (x.smile > 0.12) return 'softSmile';
  return 'neutral';
}

/** 프레임이 Unity 에서 어느 칸으로 풀리는지. */
export function classifyFrame(frame: FaceFrame): SpriteExpression {
  return classifyFeatures(featuresFromFrame(frame), frame.tracking === 'lost');
}
