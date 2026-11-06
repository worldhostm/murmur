import { describe, expect, it } from 'vitest';
import { RoomFullError, RoomNotFoundError, RoomRegistry, generateRoomCode } from '../src/rooms';

const make = () => {
  let n = 0;
  return new RoomRegistry(
    () => `s${++n}`,
    () => 1000,
  );
};

describe('rooms', () => {
  it('code is 6 uppercase alnum without ambiguous chars', () => {
    for (let i = 0; i < 50; i++) expect(generateRoomCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });

  it('enforces capacity', () => {
    const r = make();
    const room = r.create('host', 2);
    r.join(room.code, 'u1');
    expect(() => r.join(room.code, 'u2')).toThrow(RoomFullError);
    expect(() => r.join('ZZZZZZ', 'u2')).toThrow(RoomNotFoundError);
    expect(r.join(room.code, 'u1').participants).toHaveLength(2); // 재입장은 무시
  });

  it('transfers host when host leaves and disposes when empty', () => {
    const r = make();
    const room = r.create('host');
    r.join(room.code, 'u1');
    const after = r.leave(room.code, 'host');
    expect(after?.hostId).toBe('u1');
    expect(r.leave(room.code, 'u1')).toBeUndefined();
    expect(r.size).toBe(0);
    expect(r.get(room.code)).toBeUndefined();
  });
});
