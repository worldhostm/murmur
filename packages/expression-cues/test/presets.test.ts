import { describe, expect, it } from 'vitest';
import { encodeFrame, decodeFrame, validateFrame } from '@murmur/face-protocol';
import { classifyFrame, frameForExpression, SPRITE_EXPRESSIONS } from '../src';

describe('frameForExpression', () => {
  it.each(SPRITE_EXPRESSIONS)('%s round-trips through the Unity classifier rules', (expression) => {
    const frame = frameForExpression(expression, 123);
    expect(validateFrame(frame)).toBe(true);
    expect(classifyFrame(frame)).toBe(expression);
    // 코덱을 거쳐도 같은 칸 (양자화 손실 확인).
    expect(classifyFrame(decodeFrame(encodeFrame(frame)))).toBe(expression);
  });

  it('keeps the head pose neutral and the timestamp as given', () => {
    const frame = frameForExpression('bigSmile', 4567);
    expect(frame.timestampMs).toBe(4567);
    expect(frame.tracking).toBe('tracked');
    expect(frame.headPose.rotation).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it('lost tracking classifies as neutral regardless of coefficients', () => {
    const frame = frameForExpression('angry');
    frame.tracking = 'lost';
    expect(classifyFrame(frame)).toBe('neutral');
  });
});
