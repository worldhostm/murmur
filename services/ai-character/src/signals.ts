import { blendShapeIndex, type FaceFrame } from '@murmur/face-protocol';
import type { ExpressionSignals } from './adapters/types';

const avg = (frame: FaceFrame, names: Parameters<typeof blendShapeIndex>[0][]): number =>
  names.reduce((sum, n) => sum + (frame.blendShapes[blendShapeIndex(n)] ?? 0), 0) / names.length;

const max = (frame: FaceFrame, names: Parameters<typeof blendShapeIndex>[0][]): number =>
  names.reduce((m, n) => Math.max(m, frame.blendShapes[blendShapeIndex(n)] ?? 0), 0);

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * face-protocol 프레임 → LLM 에 넘길 표정 신호.
 * 원본 영상이 아니라 계수만 쓴다. 아래 휴리스틱은 자리표시자이며, 0단계 PoC 에서 실제 데이터로 보정한다.
 *  - smile    = mouthSmileLeft/Right 평균
 *  - frown    = mouthFrownLeft/Right, browDownLeft/Right 평균
 *  - gazeAway = 눈 look In/Out/Up/Down 8개 중 최댓값
 *  - fatigue  = eyeBlink 평균 × 0.5 + eyeSquint 평균 × 0.5
 */
export function expressionSignalsFromFrame(frame: FaceFrame): ExpressionSignals {
  return {
    smile: clamp01(avg(frame, ['mouthSmileLeft', 'mouthSmileRight'])),
    frown: clamp01(
      avg(frame, ['mouthFrownLeft', 'mouthFrownRight', 'browDownLeft', 'browDownRight']),
    ),
    gazeAway: clamp01(
      max(frame, [
        'eyeLookInLeft',
        'eyeLookOutLeft',
        'eyeLookUpLeft',
        'eyeLookDownLeft',
        'eyeLookInRight',
        'eyeLookOutRight',
        'eyeLookUpRight',
        'eyeLookDownRight',
      ]),
    ),
    fatigue: clamp01(
      avg(frame, ['eyeBlinkLeft', 'eyeBlinkRight']) * 0.5 +
        avg(frame, ['eyeSquintLeft', 'eyeSquintRight']) * 0.5,
    ),
  };
}

/** 지수 이동 평균. alpha 가 1 이면 next 그대로, 0 이면 prev 그대로. */
export function smoothSignals(
  prev: ExpressionSignals,
  next: ExpressionSignals,
  alpha: number,
): ExpressionSignals {
  const a = clamp01(alpha);
  const mix = (p: number, n: number): number => p + (n - p) * a;
  return {
    smile: mix(prev.smile, next.smile),
    frown: mix(prev.frown, next.frown),
    gazeAway: mix(prev.gazeAway, next.gazeAway),
    fatigue: mix(prev.fatigue, next.fatigue),
  };
}

export const NEUTRAL_SIGNALS: ExpressionSignals = { smile: 0, frown: 0, gazeAway: 0, fatigue: 0 };
