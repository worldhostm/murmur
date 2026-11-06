import type { FaceFrame, TrackingState } from './types';
import { BLEND_SHAPE_COUNT, PROTOCOL_VERSION } from './types';
import { assertFrame } from './validate';

/** 픽스처·디버깅용 평문 표현. blendShapes 는 소수 4자리로 반올림한 number[]. */
export interface FaceFrameJson {
  version: 1;
  timestampMs: number;
  tracking: TrackingState;
  blendShapes: number[];
  headPose: {
    rotation: { x: number; y: number; z: number; w: number };
    position: { x: number; y: number; z: number };
  };
}

const round4 = (v: number): number => Math.round(v * 10000) / 10000;

export function frameToJson(frame: FaceFrame): FaceFrameJson {
  const { rotation: r, position: p } = frame.headPose;
  return {
    version: PROTOCOL_VERSION,
    timestampMs: frame.timestampMs,
    tracking: frame.tracking,
    blendShapes: Array.from(frame.blendShapes, round4),
    headPose: {
      rotation: { x: r.x, y: r.y, z: r.z, w: r.w },
      position: { x: p.x, y: p.y, z: p.z },
    },
  };
}

/** 검증 후 Float32Array 기반 FaceFrame 으로 변환. 잘못된 입력은 InvalidFrameError. */
export function frameFromJson(json: unknown): FaceFrame {
  assertFrame(json);
  const blendShapes = new Float32Array(BLEND_SHAPE_COUNT);
  for (let i = 0; i < BLEND_SHAPE_COUNT; i++) blendShapes[i] = json.blendShapes[i] ?? 0;
  const { rotation: r, position: p } = json.headPose;
  return {
    version: PROTOCOL_VERSION,
    timestampMs: json.timestampMs,
    tracking: json.tracking,
    blendShapes,
    headPose: {
      rotation: { x: r.x, y: r.y, z: r.z, w: r.w },
      position: { x: p.x, y: p.y, z: p.z },
    },
  };
}
