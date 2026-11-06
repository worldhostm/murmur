import {
  BLEND_SHAPE_NAMES,
  BLEND_SHAPE_COUNT,
  FRAME_BYTE_LENGTH,
  PROTOCOL_VERSION,
  TRACKING_STATES,
} from '../dist/generated/blendShapes';

export { BLEND_SHAPE_NAMES, BLEND_SHAPE_COUNT, FRAME_BYTE_LENGTH, PROTOCOL_VERSION, TRACKING_STATES };

export type BlendShapeName = (typeof BLEND_SHAPE_NAMES)[number];
export type TrackingState = (typeof TRACKING_STATES)[number];
export type ProtocolVersion = typeof PROTOCOL_VERSION;

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface HeadPose {
  /** 단위 쿼터니언. */
  rotation: Quaternion;
  /** 카메라 기준 미터. 카메라는 -z 를 본다. */
  position: Vector3;
}

/**
 * 표정 한 프레임. 원본 영상은 절대 담지 않는다.
 * blendShapes 는 BLEND_SHAPE_NAMES 순서의 52개 계수(0..1).
 */
export interface FaceFrame {
  version: ProtocolVersion;
  /** 세션 시작 기준 ms. */
  timestampMs: number;
  tracking: TrackingState;
  blendShapes: Float32Array | number[];
  headPose: HeadPose;
}

const INDEX_BY_NAME: ReadonlyMap<string, number> = new Map(
  BLEND_SHAPE_NAMES.map((name, i) => [name, i] as const),
);

/** 정규 순서에서의 index. 알 수 없는 이름이면 throw. */
export function blendShapeIndex(name: BlendShapeName): number {
  const idx = INDEX_BY_NAME.get(name);
  if (idx === undefined) throw new RangeError(`unknown blend shape: ${String(name)}`);
  return idx;
}

export function isBlendShapeName(value: unknown): value is BlendShapeName {
  return typeof value === 'string' && INDEX_BY_NAME.has(value);
}

export function isTrackingState(value: unknown): value is TrackingState {
  return typeof value === 'string' && (TRACKING_STATES as readonly string[]).includes(value);
}
