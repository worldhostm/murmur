import { describe, expect, it } from 'vitest';
import { InvalidTransitionError, createSession, transition } from '../src/session';

describe('session transitions', () => {
  it('idle → connecting → connected → reconnecting → connected → ended', () => {
    let s = createSession('s1', 'room', []);
    s = transition(s, 'connecting', () => 1);
    s = transition(s, 'connected', () => 2);
    expect(s.startedAt).toBe(2);
    s = transition(s, 'reconnecting', () => 3);
    s = transition(s, 'connected', () => 4);
    expect(s.startedAt).toBe(2);
    s = transition(s, 'ended', () => 5);
    expect(s.endedAt).toBe(5);
  });

  it('rejects invalid transitions', () => {
    const s = createSession('s1', 'solo', []);
    expect(() => transition(s, 'connected')).toThrow(InvalidTransitionError);
    const ended = transition(transition(s, 'connecting'), 'ended');
    expect(() => transition(ended, 'connecting')).toThrow(InvalidTransitionError);
  });
});
