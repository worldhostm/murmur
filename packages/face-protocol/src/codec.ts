import { InvalidFrameError, UnsupportedVersionError } from './errors';
import type { FaceFrame, TrackingState } from './types';
import { BLEND_SHAPE_COUNT, FRAME_BYTE_LENGTH, PROTOCOL_VERSION, TRACKING_STATES } from './types';
import { assertFrame } from './validate';

export { FRAME_BYTE_LENGTH };

const MAGIC_0 = 0x4d; // 'M'
const MAGIC_1 = 0x46; // 'F'
const LITTLE_ENDIAN = true;
const U16_MAX = 0xffff;

const OFF_MAGIC = 0;
const OFF_VERSION = 2;
const OFF_TRACKING = 3;
const OFF_TIMESTAMP = 4;
const OFF_BLEND_SHAPES = 12;
const OFF_ROTATION = OFF_BLEND_SHAPES + BLEND_SHAPE_COUNT * 2;
const OFF_POSITION = OFF_ROTATION + 16;
const V1_LENGTH = OFF_POSITION + 12;

if (V1_LENGTH !== FRAME_BYTE_LENGTH) {
  throw new Error(`wire layout mismatch: computed ${V1_LENGTH}, schema says ${FRAME_BYTE_LENGTH}`);
}

function clamp01(v: number): number {
  if (!(v > 0)) return 0; // NaN 도 0
  return v > 1 ? 1 : v;
}

function trackingCode(state: TrackingState): number {
  return TRACKING_STATES.indexOf(state);
}

function trackingFromCode(code: number): TrackingState {
  const state = TRACKING_STATES[code];
  if (state === undefined) throw new InvalidFrameError(`tracking: unknown code ${code}`);
  return state;
}

/**
 * FaceFrame → v1 바이너리(144 bytes, little-endian).
 * blendShapes 는 0..1 로 클램프한 뒤 uint16 으로 양자화한다.
 */
export function encodeFrame(frame: FaceFrame): Uint8Array {
  if (frame.blendShapes.length !== BLEND_SHAPE_COUNT) {
    throw new InvalidFrameError(
      `blendShapes: expected ${BLEND_SHAPE_COUNT} entries, got ${frame.blendShapes.length}`,
    );
  }
  const buf = new ArrayBuffer(FRAME_BYTE_LENGTH);
  const view = new DataView(buf);
  view.setUint8(OFF_MAGIC, MAGIC_0);
  view.setUint8(OFF_MAGIC + 1, MAGIC_1);
  view.setUint8(OFF_VERSION, PROTOCOL_VERSION);
  const code = trackingCode(frame.tracking);
  if (code < 0) throw new InvalidFrameError(`tracking: unknown state ${String(frame.tracking)}`);
  view.setUint8(OFF_TRACKING, code);
  view.setFloat64(OFF_TIMESTAMP, frame.timestampMs, LITTLE_ENDIAN);
  for (let i = 0; i < BLEND_SHAPE_COUNT; i++) {
    const q = Math.round(clamp01(frame.blendShapes[i] ?? 0) * U16_MAX);
    view.setUint16(OFF_BLEND_SHAPES + i * 2, q, LITTLE_ENDIAN);
  }
  const { rotation: r, position: p } = frame.headPose;
  view.setFloat32(OFF_ROTATION, r.x, LITTLE_ENDIAN);
  view.setFloat32(OFF_ROTATION + 4, r.y, LITTLE_ENDIAN);
  view.setFloat32(OFF_ROTATION + 8, r.z, LITTLE_ENDIAN);
  view.setFloat32(OFF_ROTATION + 12, r.w, LITTLE_ENDIAN);
  view.setFloat32(OFF_POSITION, p.x, LITTLE_ENDIAN);
  view.setFloat32(OFF_POSITION + 4, p.y, LITTLE_ENDIAN);
  view.setFloat32(OFF_POSITION + 8, p.z, LITTLE_ENDIAN);
  return new Uint8Array(buf);
}

function decodeV1(view: DataView): FaceFrame {
  if (view.byteLength < V1_LENGTH) {
    throw new InvalidFrameError(`frame too short: expected ${V1_LENGTH} bytes, got ${view.byteLength}`);
  }
  const blendShapes = new Float32Array(BLEND_SHAPE_COUNT);
  for (let i = 0; i < BLEND_SHAPE_COUNT; i++) {
    blendShapes[i] = view.getUint16(OFF_BLEND_SHAPES + i * 2, LITTLE_ENDIAN) / U16_MAX;
  }
  const f = (off: number): number => {
    const v = view.getFloat32(off, LITTLE_ENDIAN);
    return Number.isFinite(v) ? v : 0;
  };
  const ts = view.getFloat64(OFF_TIMESTAMP, LITTLE_ENDIAN);
  return {
    version: PROTOCOL_VERSION,
    timestampMs: Number.isFinite(ts) ? ts : 0,
    tracking: trackingFromCode(view.getUint8(OFF_TRACKING)),
    blendShapes,
    headPose: {
      rotation: { x: f(OFF_ROTATION), y: f(OFF_ROTATION + 4), z: f(OFF_ROTATION + 8), w: f(OFF_ROTATION + 12) },
      position: { x: f(OFF_POSITION), y: f(OFF_POSITION + 4), z: f(OFF_POSITION + 8) },
    },
  };
}

/**
 * 버전 정책: 현재 버전 N 과 N-1 을 받는다. 새 버전을 추가하면 이 표에 디코더를 넣고,
 * N-2 는 제거한다. v1 이 최초 버전이므로 지금은 v1 만 있다.
 */
const DECODERS: ReadonlyMap<number, (view: DataView) => FaceFrame> = new Map([[1, decodeV1]]);

export const SUPPORTED_VERSIONS: readonly number[] = [...DECODERS.keys()];

/** 바이너리 → FaceFrame. 버전은 헤더에서 읽어 디스패치한다. */
export function decodeFrame(bytes: Uint8Array | ArrayBuffer): FaceFrame {
  const view =
    bytes instanceof ArrayBuffer
      ? new DataView(bytes)
      : new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.byteLength < OFF_TIMESTAMP) {
    throw new InvalidFrameError(`frame too short: ${view.byteLength} bytes`);
  }
  if (view.getUint8(OFF_MAGIC) !== MAGIC_0 || view.getUint8(OFF_MAGIC + 1) !== MAGIC_1) {
    throw new InvalidFrameError('bad magic: expected "MF"');
  }
  const version = view.getUint8(OFF_VERSION);
  const decoder = DECODERS.get(version);
  if (!decoder) throw new UnsupportedVersionError(version, SUPPORTED_VERSIONS);
  return decoder(view);
}

/** 검증까지 포함한 안전한 인코딩. 신뢰할 수 없는 입력에 쓴다. */
export function encodeFrameChecked(frame: unknown): Uint8Array {
  assertFrame(frame);
  return encodeFrame(frame);
}
