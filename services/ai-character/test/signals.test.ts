import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { frameFromJson, neutralFrame } from '@murmur/face-protocol';
import { expressionSignalsFromFrame, smoothSignals, NEUTRAL_SIGNALS } from '../src/signals';

const FIXTURES = join(import.meta.dirname, '../../../packages/face-protocol/test/fixtures');
const load = (name: string) =>
  frameFromJson(JSON.parse(readFileSync(join(FIXTURES, name), 'utf8')));

describe('expressionSignalsFromFrame', () => {
  it('smile fixture → smile > 0.7, frown ≈ 0', () => {
    const s = expressionSignalsFromFrame(load('smile.json'));
    expect(s.smile).toBeGreaterThan(0.7);
    expect(s.frown).toBeCloseTo(0, 5);
    expect(s.gazeAway).toBe(0);
  });

  it('neutral → all zeros', () => {
    expect(expressionSignalsFromFrame(neutralFrame())).toEqual(NEUTRAL_SIGNALS);
  });

  it('smoothSignals interpolates', () => {
    const next = { smile: 1, frown: 0, gazeAway: 0.5, fatigue: 0 };
    const half = smoothSignals(NEUTRAL_SIGNALS, next, 0.5);
    expect(half.smile).toBeCloseTo(0.5);
    expect(half.gazeAway).toBeCloseTo(0.25);
    expect(smoothSignals(NEUTRAL_SIGNALS, next, 1)).toEqual(next);
  });
});
