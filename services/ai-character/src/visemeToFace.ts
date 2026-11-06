import {
  blendShapeIndex,
  neutralFrame,
  type BlendShapeName,
  type FaceFrame,
} from '@murmur/face-protocol';
import type { Viseme, VisemeShape } from './adapters/types';

/**
 * viseme → 블렌드셰이프 표. 합성 음성의 입 모양을 아바타 엔진이 쓰는 52개 계수로 옮긴다.
 *
 * | viseme | 계수 |
 * | aa | jawOpen 0.7 |
 * | E  | jawOpen 0.4, mouthSmileLeft/Right 0.3 |
 * | ih | jawOpen 0.3, mouthStretchLeft/Right 0.3 |
 * | oh | jawOpen 0.5, mouthFunnel 0.6 |
 * | ou | mouthPucker 0.8, mouthFunnel 0.4 |
 * | PP | mouthClose 1, mouthPressLeft/Right 0.6 |
 * | FF | mouthLowerDownLeft/Right 0.4, mouthRollLower 0.5 |
 * | TH | tongueOut 0.4, jawOpen 0.2 |
 * | DD kk nn RR | jawOpen 0.25 |
 * | SS | jawOpen 0.25, mouthStretchLeft/Right 0.2 |
 * | CH | jawOpen 0.25, mouthFunnel 0.3 |
 * | sil | 전부 0 |
 */
export const VISEME_TABLE: Record<VisemeShape, Partial<Record<BlendShapeName, number>>> = {
  sil: {},
  aa: { jawOpen: 0.7 },
  E: { jawOpen: 0.4, mouthSmileLeft: 0.3, mouthSmileRight: 0.3 },
  ih: { jawOpen: 0.3, mouthStretchLeft: 0.3, mouthStretchRight: 0.3 },
  oh: { jawOpen: 0.5, mouthFunnel: 0.6 },
  ou: { mouthPucker: 0.8, mouthFunnel: 0.4 },
  PP: { mouthClose: 1, mouthPressLeft: 0.6, mouthPressRight: 0.6 },
  FF: { mouthLowerDownLeft: 0.4, mouthLowerDownRight: 0.4, mouthRollLower: 0.5 },
  TH: { tongueOut: 0.4, jawOpen: 0.2 },
  DD: { jawOpen: 0.25 },
  kk: { jawOpen: 0.25 },
  nn: { jawOpen: 0.25 },
  RR: { jawOpen: 0.25 },
  SS: { jawOpen: 0.25, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 },
  CH: { jawOpen: 0.25, mouthFunnel: 0.3 },
};

export interface VisemeToFaceOptions {
  fps: number;
  startTimestampMs: number;
  /** 마지막 viseme 이후 입을 닫기까지의 길이(ms). */
  tailMs?: number;
}

function visemeWeights(v: Viseme): Float32Array {
  const out = new Float32Array(52);
  for (const [name, value] of Object.entries(VISEME_TABLE[v.shape])) {
    out[blendShapeIndex(name as BlendShapeName)] = (value ?? 0) * v.weight;
  }
  return out;
}

/**
 * viseme 열 → 지정 fps 의 FaceFrame 열. 인접 viseme 사이는 선형 보간한다.
 * 머리 포즈는 항등(회전 없음)이고 tracking 은 'tracked'. 결과는 validateFrame 을 통과한다.
 */
export function visemesToFaceFrames(visemes: Viseme[], opts: VisemeToFaceOptions): FaceFrame[] {
  if (!(opts.fps > 0)) throw new RangeError('fps 는 양수여야 합니다');
  if (visemes.length === 0) return [];
  const sorted = [...visemes].sort((a, b) => a.timeMs - b.timeMs);
  const tailMs = opts.tailMs ?? 100;
  const last = sorted[sorted.length - 1]!;
  // 끝에 무음을 붙여 입을 닫는다.
  const keys = [...sorted, { timeMs: last.timeMs + tailMs, shape: 'sil' as const, weight: 1 }];
  const weights = keys.map(visemeWeights);
  const durationMs = keys[keys.length - 1]!.timeMs - keys[0]!.timeMs;
  const frameMs = 1000 / opts.fps;
  const frameCount = Math.max(1, Math.ceil(durationMs / frameMs));

  const frames: FaceFrame[] = [];
  let k = 0;
  for (let i = 0; i < frameCount; i++) {
    const t = keys[0]!.timeMs + i * frameMs;
    while (k + 1 < keys.length - 1 && keys[k + 1]!.timeMs <= t) k++;
    const a = keys[k]!;
    const b = keys[k + 1]!;
    const span = b.timeMs - a.timeMs;
    const u = span > 0 ? Math.min(1, Math.max(0, (t - a.timeMs) / span)) : 0;
    const frame = neutralFrame(opts.startTimestampMs + Math.round(t));
    const bs = frame.blendShapes as Float32Array;
    const wa = weights[k]!;
    const wb = weights[k + 1]!;
    for (let j = 0; j < 52; j++) bs[j] = wa[j]! + (wb[j]! - wa[j]!) * u;
    frames.push(frame);
  }
  return frames;
}
