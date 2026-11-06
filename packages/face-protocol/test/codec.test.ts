import { describe, expect, it } from 'vitest';
import {
  BLEND_SHAPE_COUNT,
  FRAME_BYTE_LENGTH,
  InvalidFrameError,
  UnsupportedVersionError,
  SUPPORTED_VERSIONS,
  decodeFrame,
  encodeFrame,
  encodeFrameChecked,
  neutralFrame,
  type FaceFrame,
} from '../src/index';

/** 결정적 PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomFrame(next: () => number, timestampMs: number): FaceFrame {
  const bs = new Float32Array(BLEND_SHAPE_COUNT);
  for (let i = 0; i < BLEND_SHAPE_COUNT; i++) bs[i] = next();
  // 임의 단위 쿼터니언
  const q = [next() - 0.5, next() - 0.5, next() - 0.5, next() - 0.5];
  const len = Math.hypot(...q);
  const [x, y, z, w] = q.map((v) => Math.fround(v / len)) as [number, number, number, number];
  return {
    version: 1,
    timestampMs,
    tracking: (['tracked', 'limited', 'lost'] as const)[Math.floor(next() * 3)]!,
    blendShapes: bs,
    headPose: {
      rotation: { x, y, z, w },
      position: {
        x: Math.fround(next() - 0.5),
        y: Math.fround(next() - 0.5),
        z: Math.fround(-next()),
      },
    },
  };
}

describe('codec v1', () => {
  it('FRAME_BYTE_LENGTH is 144 and matches encoded length', () => {
    expect(FRAME_BYTE_LENGTH).toBe(144);
    expect(encodeFrame(neutralFrame()).byteLength).toBe(144);
  });

  it('starts with magic "MF" and version 1', () => {
    const bytes = encodeFrame(neutralFrame());
    expect(bytes[0]).toBe(0x4d);
    expect(bytes[1]).toBe(0x46);
    expect(bytes[2]).toBe(1);
  });

  it('round-trips 200 seeded random frames', () => {
    const next = rng(20261106);
    for (let i = 0; i < 200; i++) {
      const frame = randomFrame(next, i * 33.3333);
      const decoded = decodeFrame(encodeFrame(frame));

      expect(decoded.version).toBe(1);
      expect(decoded.timestampMs).toBe(frame.timestampMs);
      expect(decoded.tracking).toBe(frame.tracking);
      expect(decoded.blendShapes.length).toBe(BLEND_SHAPE_COUNT);
      for (let k = 0; k < BLEND_SHAPE_COUNT; k++) {
        expect(Math.abs(decoded.blendShapes[k]! - frame.blendShapes[k]!)).toBeLessThanOrEqual(1 / 65535);
      }
      const { rotation: r, position: p } = frame.headPose;
      expect(decoded.headPose.rotation.x).toBeCloseTo(r.x, 6);
      expect(decoded.headPose.rotation.y).toBeCloseTo(r.y, 6);
      expect(decoded.headPose.rotation.z).toBeCloseTo(r.z, 6);
      expect(decoded.headPose.rotation.w).toBeCloseTo(r.w, 6);
      expect(decoded.headPose.position.x).toBeCloseTo(p.x, 6);
      expect(decoded.headPose.position.y).toBeCloseTo(p.y, 6);
      expect(decoded.headPose.position.z).toBeCloseTo(p.z, 6);
    }
  });

  it('accepts number[] blendShapes and Uint8Array views with offsets', () => {
    const frame = neutralFrame(5);
    frame.blendShapes = new Array<number>(BLEND_SHAPE_COUNT).fill(0.5);
    const bytes = encodeFrame(frame);
    const padded = new Uint8Array(bytes.length + 7);
    padded.set(bytes, 7);
    const decoded = decodeFrame(padded.subarray(7));
    expect(decoded.blendShapes[0]).toBeCloseTo(0.5, 4);
    expect(decoded.timestampMs).toBe(5);
  });

  it('clamps out-of-range blend shapes to 0 and 1, and NaN to 0', () => {
    const frame = neutralFrame();
    frame.blendShapes = new Array<number>(BLEND_SHAPE_COUNT).fill(0);
    frame.blendShapes[0] = -0.5;
    frame.blendShapes[1] = 1.5;
    frame.blendShapes[2] = Number.NaN;
    const decoded = decodeFrame(encodeFrame(frame));
    expect(decoded.blendShapes[0]).toBe(0);
    expect(decoded.blendShapes[1]).toBe(1);
    expect(decoded.blendShapes[2]).toBe(0);
  });

  it('never produces NaN when decoding garbage float bytes', () => {
    const bytes = encodeFrame(neutralFrame());
    // 회전 x 를 float32 NaN (0x7FC00000 LE) 으로 덮어쓴다
    bytes.set([0x00, 0x00, 0xc0, 0x7f], 116);
    const decoded = decodeFrame(bytes);
    expect(Number.isNaN(decoded.headPose.rotation.x)).toBe(false);
    for (const v of decoded.blendShapes) expect(Number.isNaN(v)).toBe(false);
  });

  it('rejects bad magic', () => {
    const bytes = encodeFrame(neutralFrame());
    bytes[0] = 0x00;
    expect(() => decodeFrame(bytes)).toThrow(InvalidFrameError);
    expect(() => decodeFrame(bytes)).toThrow(/magic/);
  });

  it('rejects unsupported version with UnsupportedVersionError', () => {
    const bytes = encodeFrame(neutralFrame());
    bytes[2] = 9;
    let caught: unknown;
    try {
      decodeFrame(bytes);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(UnsupportedVersionError);
    expect((caught as UnsupportedVersionError).version).toBe(9);
    expect((caught as UnsupportedVersionError).supported).toEqual(SUPPORTED_VERSIONS);
  });

  it('supports exactly version 1 (no v0 exists)', () => {
    expect(SUPPORTED_VERSIONS).toEqual([1]);
  });

  it('rejects truncated buffers', () => {
    const bytes = encodeFrame(neutralFrame());
    expect(() => decodeFrame(bytes.subarray(0, 143))).toThrow(InvalidFrameError);
    expect(() => decodeFrame(bytes.subarray(0, 2))).toThrow(InvalidFrameError);
    expect(() => decodeFrame(new Uint8Array(0))).toThrow(InvalidFrameError);
  });

  it('rejects unknown tracking code on decode', () => {
    const bytes = encodeFrame(neutralFrame());
    bytes[3] = 200;
    expect(() => decodeFrame(bytes)).toThrow(/tracking/);
  });

  it('encodeFrame rejects wrong blend shape count', () => {
    const frame = neutralFrame();
    frame.blendShapes = new Float32Array(10);
    expect(() => encodeFrame(frame)).toThrow(InvalidFrameError);
  });

  it('encodeFrameChecked validates before encoding', () => {
    expect(() => encodeFrameChecked({ version: 1 })).toThrow(InvalidFrameError);
    expect(encodeFrameChecked(neutralFrame()).byteLength).toBe(FRAME_BYTE_LENGTH);
  });
});
