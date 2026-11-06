import { describe, expect, it } from 'vitest';
import { BLEND_SHAPE_COUNT, InvalidFrameError, assertFrame, neutralFrame, validateFrame } from '../src/index';

function withBlendShapes(bs: number[]) {
  const f = neutralFrame();
  return { ...f, blendShapes: bs };
}

describe('validateFrame / assertFrame', () => {
  it('accepts a neutral frame', () => {
    expect(validateFrame(neutralFrame())).toBe(true);
  });

  it('rejects non-objects and wrong version', () => {
    expect(validateFrame(null)).toBe(false);
    expect(validateFrame(42)).toBe(false);
    expect(validateFrame({ ...neutralFrame(), version: 2 })).toBe(false);
    expect(() => assertFrame({ ...neutralFrame(), version: 2 })).toThrow(/version/);
  });

  it('rejects wrong blend shape count', () => {
    expect(validateFrame(withBlendShapes(new Array(51).fill(0)))).toBe(false);
    expect(() => assertFrame(withBlendShapes(new Array(53).fill(0)))).toThrow(/expected 52 entries/);
  });

  it('rejects NaN / Infinity / out-of-range blend shapes', () => {
    const nan = new Array<number>(BLEND_SHAPE_COUNT).fill(0);
    nan[3] = Number.NaN;
    expect(() => assertFrame(withBlendShapes(nan))).toThrow(/blendShapes\[3\]/);
    const big = new Array<number>(BLEND_SHAPE_COUNT).fill(0);
    big[7] = 1.2;
    expect(() => assertFrame(withBlendShapes(big))).toThrow(/out of range/);
    const neg = new Array<number>(BLEND_SHAPE_COUNT).fill(0);
    neg[0] = -0.01;
    expect(validateFrame(withBlendShapes(neg))).toBe(false);
  });

  it('rejects non-unit quaternion', () => {
    const f = neutralFrame();
    f.headPose.rotation = { x: 0, y: 0, z: 0, w: 1.01 };
    expect(validateFrame(f)).toBe(false);
    expect(() => assertFrame(f)).toThrow(/unit quaternion/);
  });

  it('accepts quaternion within 1e-3 tolerance', () => {
    const f = neutralFrame();
    f.headPose.rotation = { x: 0, y: 0, z: 0, w: 1.0005 };
    expect(validateFrame(f)).toBe(true);
  });

  it('rejects unknown tracking state', () => {
    const f = { ...neutralFrame(), tracking: 'perfect' };
    expect(validateFrame(f)).toBe(false);
    expect(() => assertFrame(f)).toThrow(/tracking/);
  });

  it('rejects negative or non-finite timestamp', () => {
    expect(validateFrame({ ...neutralFrame(), timestampMs: -1 })).toBe(false);
    expect(validateFrame({ ...neutralFrame(), timestampMs: Number.POSITIVE_INFINITY })).toBe(false);
  });

  it('rejects missing or non-finite head pose fields', () => {
    const f = neutralFrame();
    f.headPose.position = { x: 0, y: Number.NaN, z: 0 };
    expect(() => assertFrame(f)).toThrow(/headPose\.position\.y/);
    expect(validateFrame({ ...neutralFrame(), headPose: {} })).toBe(false);
  });

  it('throws InvalidFrameError specifically', () => {
    expect(() => assertFrame({})).toThrow(InvalidFrameError);
  });
});
