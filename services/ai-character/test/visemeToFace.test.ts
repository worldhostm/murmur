import { describe, expect, it } from 'vitest';
import { blendShapeIndex, validateFrame } from '@murmur/face-protocol';
import { visemesToFaceFrames } from '../src/visemeToFace';
import type { Viseme } from '../src/adapters/types';

describe('visemesToFaceFrames', () => {
  const visemes: Viseme[] = [
    { timeMs: 0, shape: 'sil', weight: 1 },
    { timeMs: 100, shape: 'aa', weight: 1 },
    { timeMs: 200, shape: 'PP', weight: 1 },
    { timeMs: 300, shape: 'sil', weight: 1 },
  ];

  it('produces valid frames at 30fps with count = ceil(duration / 33.3)', () => {
    const frames = visemesToFaceFrames(visemes, { fps: 30, startTimestampMs: 5000, tailMs: 100 });
    // 0 → 300ms + tail 100ms = 400ms
    expect(frames).toHaveLength(Math.ceil(400 / (1000 / 30)));
    for (const f of frames) {
      expect(validateFrame(f)).toBe(true);
      expect(f.tracking).toBe('tracked');
      expect(f.headPose.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    }
    expect(frames[0]!.timestampMs).toBe(5000);
  });

  it('jawOpen peaks at the aa viseme and mouthClose at PP', () => {
    const frames = visemesToFaceFrames(visemes, { fps: 100, startTimestampMs: 0 });
    const jaw = blendShapeIndex('jawOpen');
    const close = blendShapeIndex('mouthClose');
    const at = (ms: number) => frames.find((f) => f.timestampMs === ms)!;
    expect(at(100).blendShapes[jaw]).toBeCloseTo(0.7, 5);
    expect(at(50).blendShapes[jaw]).toBeCloseTo(0.35, 5);
    expect(at(200).blendShapes[close]).toBeCloseTo(1, 5);
    expect(at(200).blendShapes[jaw]).toBeCloseTo(0, 5);
  });

  it('empty input → no frames; bad fps throws', () => {
    expect(visemesToFaceFrames([], { fps: 30, startTimestampMs: 0 })).toEqual([]);
    expect(() => visemesToFaceFrames(visemes, { fps: 0, startTimestampMs: 0 })).toThrow();
  });
});
