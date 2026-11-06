import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BLEND_SHAPE_COUNT,
  InvalidFrameError,
  blendShapeIndex,
  decodeFrame,
  encodeFrame,
  frameFromJson,
  frameToJson,
  neutralFrame,
} from '../src/index';

const fixture = (name: string): unknown =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'));

describe('json fixtures', () => {
  it('neutral.json equals neutralFrame()', () => {
    const frame = frameFromJson(fixture('neutral.json'));
    expect(frameToJson(frame)).toEqual(frameToJson(neutralFrame(0)));
  });

  it('smile.json loads with expected coefficients', () => {
    const frame = frameFromJson(fixture('smile.json'));
    expect(frame.blendShapes).toBeInstanceOf(Float32Array);
    expect(frame.blendShapes[blendShapeIndex('mouthSmileLeft')]).toBeCloseTo(0.8, 5);
    expect(frame.blendShapes[blendShapeIndex('mouthSmileRight')]).toBeCloseTo(0.8, 5);
    expect(frame.blendShapes[blendShapeIndex('cheekSquintLeft')]).toBeCloseTo(0.4, 5);
    expect(frame.blendShapes[blendShapeIndex('eyeSquintRight')]).toBeCloseTo(0.3, 5);
    expect(frame.blendShapes[blendShapeIndex('jawOpen')]).toBeCloseTo(0.1, 5);
    expect(frame.blendShapes[blendShapeIndex('tongueOut')]).toBe(0);
    expect(frame.timestampMs).toBe(1234.5);
  });

  it('json → frame → json round-trips (4 decimals)', () => {
    const json = fixture('smile.json');
    expect(frameToJson(frameFromJson(json))).toEqual(json);
  });

  it('json → binary → json round-trips within quantization error', () => {
    const original = frameFromJson(fixture('smile.json'));
    const decoded = decodeFrame(encodeFrame(original));
    const a = frameToJson(original);
    const b = frameToJson(decoded);
    expect(b.timestampMs).toBe(a.timestampMs);
    expect(b.tracking).toBe(a.tracking);
    for (let i = 0; i < BLEND_SHAPE_COUNT; i++) {
      expect(Math.abs(a.blendShapes[i]! - b.blendShapes[i]!)).toBeLessThanOrEqual(1e-4);
    }
    expect(b.headPose.rotation.y).toBeCloseTo(a.headPose.rotation.y, 6);
    expect(b.headPose.position.z).toBeCloseTo(a.headPose.position.z, 6);
  });

  it('frameToJson rounds blend shapes to 4 decimals and emits plain arrays', () => {
    const f = neutralFrame();
    f.blendShapes[0] = 0.123456789;
    const json = frameToJson(f);
    expect(Array.isArray(json.blendShapes)).toBe(true);
    expect(json.blendShapes[0]).toBe(0.1235);
  });

  it('frameFromJson rejects invalid input', () => {
    expect(() => frameFromJson({ version: 1 })).toThrow(InvalidFrameError);
  });
});
