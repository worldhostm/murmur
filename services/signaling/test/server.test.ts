import { describe, expect, it } from 'vitest';
import { InMemoryTransport, createSignalingServer } from '../src/server';

const make = () => {
  let n = 0;
  const transport = new InMemoryTransport();
  const server = createSignalingServer({ transport, newId: () => `id${++n}`, now: () => 0 });
  return { transport, server };
};

describe('signaling server', () => {
  it('two adults join-random → both matched with the same sessionId', () => {
    const { transport, server } = make();
    transport.receive('a', { type: 'join-random', ageGate: 'adult' });
    expect(transport.eventsFor('a')).toEqual([]);
    transport.receive('b', { type: 'join-random', ageGate: 'adult' });
    const ea = transport.eventsFor('a')[0];
    const eb = transport.eventsFor('b')[0];
    expect(ea).toMatchObject({ type: 'matched', peerId: 'b', mode: 'random-match' });
    expect(eb).toMatchObject({ type: 'matched', peerId: 'a' });
    expect(ea && 'sessionId' in ea ? ea.sessionId : null).toBe(
      eb && 'sessionId' in eb ? eb.sessionId : undefined,
    );
    expect(server.sessionOf('a')).toBe(server.sessionOf('b'));

    transport.receive('a', { type: 'offer', to: 'b', sdp: 'sdp-a' });
    expect(transport.eventsFor('b')[1]).toEqual({ type: 'offer', from: 'a', sdp: 'sdp-a' });

    transport.receive('a', { type: 'leave' });
    expect(transport.eventsFor('b')[2]).toMatchObject({ type: 'peer-left', peerId: 'a' });
    expect(server.sessionOf('b')).toBeUndefined();
  });

  it('under-18 gets age-restricted error', () => {
    const { transport, server } = make();
    transport.receive('kid', { type: 'join-random', ageGate: 'under-18' });
    expect(transport.eventsFor('kid')[0]).toMatchObject({ type: 'error', code: 'age-restricted' });
    expect(server.matchmaker.size).toBe(0);
  });

  it('blocked users are not matched together', () => {
    const { transport } = make();
    transport.receive('a', { type: 'block', targetId: 'b' });
    transport.receive('a', { type: 'join-random', ageGate: 'adult' });
    transport.receive('b', { type: 'join-random', ageGate: 'adult' });
    expect(transport.eventsFor('a')).toEqual([]);
    transport.receive('c', { type: 'join-random', ageGate: 'adult' });
    expect(transport.eventsFor('a')[0]).toMatchObject({ type: 'matched', peerId: 'c' });
  });

  it('room create/join → peer-joined both ways; relay to non-peer is rejected', () => {
    const { transport } = make();
    transport.receive('host', { type: 'create-room' });
    const created = transport.eventsFor('host')[0]!;
    expect(created.type).toBe('room-created');
    const code = created.type === 'room-created' ? created.code : '';
    transport.receive('guest', { type: 'join-room', code });
    expect(transport.eventsFor('host')[1]).toMatchObject({ type: 'peer-joined', peerId: 'guest' });
    expect(transport.eventsFor('guest')[0]).toMatchObject({ type: 'peer-joined', peerId: 'host' });

    transport.receive('stranger', { type: 'ice', to: 'host', candidate: 'c' });
    expect(transport.eventsFor('stranger')[0]).toMatchObject({
      type: 'error',
      code: 'not-in-session',
    });
    transport.receive('x', { type: 'join-room', code: 'NOPE00' });
    expect(transport.eventsFor('x')[0]).toMatchObject({ type: 'error', code: 'room-not-found' });
  });

  it('report is stored with urgency and acknowledged', () => {
    const { transport, server } = make();
    transport.receive('a', { type: 'report', targetId: 'b', reason: 'minor', sessionId: 's' });
    expect(transport.eventsFor('a')[0]).toMatchObject({ type: 'reported' });
    expect(server.reports.urgent()).toHaveLength(1);
  });

  it('disconnect behaves like leave', () => {
    const { transport, server } = make();
    transport.receive('a', { type: 'join-random', ageGate: 'adult' });
    transport.disconnect('a');
    expect(server.matchmaker.size).toBe(0);
  });
});
