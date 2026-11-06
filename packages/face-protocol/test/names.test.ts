import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  BLEND_SHAPE_COUNT,
  BLEND_SHAPE_NAMES,
  PROTOCOL_VERSION,
  TRACKING_STATES,
  blendShapeIndex,
  isBlendShapeName,
  isTrackingState,
} from '../src/index';

const schema = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'schema', 'face-frame.schema.json'), 'utf8'),
) as { protocolVersion: number; blendShapeNames: string[]; trackingStates: string[] };

describe('blend shape names', () => {
  it('has 52 unique names', () => {
    expect(BLEND_SHAPE_NAMES.length).toBe(52);
    expect(BLEND_SHAPE_COUNT).toBe(52);
    expect(new Set(BLEND_SHAPE_NAMES).size).toBe(52);
  });

  it('matches schema order exactly', () => {
    expect([...BLEND_SHAPE_NAMES]).toEqual(schema.blendShapeNames);
    expect([...TRACKING_STATES]).toEqual(schema.trackingStates);
    expect(PROTOCOL_VERSION).toBe(schema.protocolVersion);
  });

  it('starts with eyeBlinkLeft and ends with tongueOut (ARKit order)', () => {
    expect(BLEND_SHAPE_NAMES[0]).toBe('eyeBlinkLeft');
    expect(BLEND_SHAPE_NAMES[51]).toBe('tongueOut');
  });

  it('blendShapeIndex returns canonical index', () => {
    expect(blendShapeIndex('eyeBlinkLeft')).toBe(0);
    expect(blendShapeIndex('jawOpen')).toBe(17);
    expect(blendShapeIndex('mouthSmileLeft')).toBe(23);
    expect(blendShapeIndex('browDownLeft')).toBe(41);
    expect(blendShapeIndex('tongueOut')).toBe(51);
    // 런타임에 잘못된 이름이 들어오면 throw
    expect(() => blendShapeIndex('nope' as never)).toThrow(RangeError);
  });

  it('type guards', () => {
    expect(isBlendShapeName('jawOpen')).toBe(true);
    expect(isBlendShapeName('JawOpen')).toBe(false);
    expect(isTrackingState('limited')).toBe(true);
    expect(isTrackingState('ok')).toBe(false);
  });
});
