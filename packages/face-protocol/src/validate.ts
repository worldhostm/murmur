import { InvalidFrameError } from './errors';
import type { FaceFrame } from './types';
import { BLEND_SHAPE_COUNT, PROTOCOL_VERSION, isTrackingState } from './types';

export const QUATERNION_UNIT_TOLERANCE = 1e-3;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function finiteNumber(v: unknown, path: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new InvalidFrameError(`${path}: expected finite number, got ${String(v)}`);
  }
  return v;
}

/** FaceFrame 형태인지 검사하고 아니면 InvalidFrameError 를 던진다. */
export function assertFrame(value: unknown): asserts value is FaceFrame {
  if (!isRecord(value)) throw new InvalidFrameError('frame: expected object');

  if (value.version !== PROTOCOL_VERSION) {
    throw new InvalidFrameError(`version: expected ${PROTOCOL_VERSION}, got ${String(value.version)}`);
  }

  const ts = finiteNumber(value.timestampMs, 'timestampMs');
  if (ts < 0) throw new InvalidFrameError(`timestampMs: must be >= 0, got ${ts}`);

  if (!isTrackingState(value.tracking)) {
    throw new InvalidFrameError(`tracking: unknown state ${String(value.tracking)}`);
  }

  const bs = value.blendShapes;
  if (!(bs instanceof Float32Array) && !Array.isArray(bs)) {
    throw new InvalidFrameError('blendShapes: expected Float32Array or number[]');
  }
  if (bs.length !== BLEND_SHAPE_COUNT) {
    throw new InvalidFrameError(`blendShapes: expected ${BLEND_SHAPE_COUNT} entries, got ${bs.length}`);
  }
  for (let i = 0; i < bs.length; i++) {
    const v = finiteNumber(bs[i], `blendShapes[${i}]`);
    if (v < 0 || v > 1) throw new InvalidFrameError(`blendShapes[${i}]: out of range 0..1, got ${v}`);
  }

  const hp = value.headPose;
  if (!isRecord(hp)) throw new InvalidFrameError('headPose: expected object');
  const rot = hp.rotation;
  if (!isRecord(rot)) throw new InvalidFrameError('headPose.rotation: expected object');
  const x = finiteNumber(rot.x, 'headPose.rotation.x');
  const y = finiteNumber(rot.y, 'headPose.rotation.y');
  const z = finiteNumber(rot.z, 'headPose.rotation.z');
  const w = finiteNumber(rot.w, 'headPose.rotation.w');
  const len = Math.hypot(x, y, z, w);
  if (Math.abs(len - 1) > QUATERNION_UNIT_TOLERANCE) {
    throw new InvalidFrameError(`headPose.rotation: expected unit quaternion, |q|=${len.toFixed(5)}`);
  }
  const pos = hp.position;
  if (!isRecord(pos)) throw new InvalidFrameError('headPose.position: expected object');
  finiteNumber(pos.x, 'headPose.position.x');
  finiteNumber(pos.y, 'headPose.position.y');
  finiteNumber(pos.z, 'headPose.position.z');
}

export function validateFrame(value: unknown): value is FaceFrame {
  try {
    assertFrame(value);
    return true;
  } catch (e) {
    if (e instanceof InvalidFrameError) return false;
    throw e;
  }
}
