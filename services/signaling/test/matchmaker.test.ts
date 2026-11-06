import { describe, expect, it } from 'vitest';
import { AgeRestrictedError, InMemoryBlockList, Matchmaker } from '../src/matchmaker';

describe('Matchmaker', () => {
  it('refuses non-adult users', () => {
    const m = new Matchmaker(new InMemoryBlockList());
    expect(() => m.enqueue({ id: 'u1', ageGate: 'under-18' })).toThrow(AgeRestrictedError);
    expect(() => m.enqueue({ id: 'u2', ageGate: 'unverified' })).toThrow(AgeRestrictedError);
    expect(m.size).toBe(0);
  });

  it('matches FIFO', () => {
    const m = new Matchmaker(new InMemoryBlockList());
    for (const id of ['a', 'b', 'c']) m.enqueue({ id, ageGate: 'adult' });
    expect(m.tryMatch()?.map((u) => u.id)).toEqual(['a', 'b']);
    expect(m.tryMatch()).toBeNull();
    expect(m.isQueued('c')).toBe(true);
  });

  it('skips blocked pairs in either direction', () => {
    const bl = new InMemoryBlockList();
    bl.block('b', 'a');
    const m = new Matchmaker(bl);
    for (const id of ['a', 'b', 'c']) m.enqueue({ id, ageGate: 'adult' });
    expect(m.tryMatch()?.map((u) => u.id)).toEqual(['a', 'c']);
    expect(m.size).toBe(1);
  });

  it('dequeue and idempotent enqueue', () => {
    const m = new Matchmaker(new InMemoryBlockList());
    m.enqueue({ id: 'a', ageGate: 'adult' });
    m.enqueue({ id: 'a', ageGate: 'adult' });
    expect(m.size).toBe(1);
    expect(m.dequeue('a')).toBe(true);
    expect(m.dequeue('a')).toBe(false);
  });
});
