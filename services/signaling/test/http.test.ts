import { describe, expect, it } from 'vitest';
import { SignalingGateway, parseMessage } from '../src/http';
import type { ServerEvent } from '@murmur/shared-types';

function poll(g: SignalingGateway, token: string, cursor = 0) {
  return g.handle(token, 'poll', cursor) as {
    events: { id: number; event: ServerEvent }[];
    cursor: number;
  };
}
describe('HTTP gateway domain integration', () => {
  it('creates and joins a real room, acknowledges events, and notifies departure', () => {
    const g = new SignalingGateway();
    const a = g.open().token;
    const b = g.open().token;
    g.handle(a, 'send', { type: 'create-room' });
    const created = poll(g, a);
    const room = created.events[0]!.event;
    if (room.type !== 'room-created') throw new Error('room');
    g.handle(b, 'send', { type: 'join-room', code: room.code });
    expect(poll(g, a, created.cursor).events[0]!.event.type).toBe('peer-joined');
    expect(poll(g, b).events[0]!.event.type).toBe('peer-joined');
    g.handle(b, 'close', null);
    expect(poll(g, a).events.at(-1)!.event.type).toBe('peer-left');
  });
  it('does not trust claimed age or accept invalid messages', () => {
    const g = new SignalingGateway();
    const token = g.open().token;
    g.handle(token, 'send', { type: 'join-random', ageGate: 'adult' });
    expect(poll(g, token).events[0]!.event).toMatchObject({
      type: 'error',
      code: 'age-restricted',
    });
    expect(() => parseMessage({ type: 'join-room', code: '../bad' })).toThrow();
    expect(() => g.handle('fake-token', 'poll', 0)).toThrow();
  });
  it('expires abandoned connections and removes room occupancy', () => {
    let now = 0;
    const g = new SignalingGateway(() => now);
    const token = g.open().token;
    g.handle(token, 'send', { type: 'create-room' });
    now = 60_001;
    g.sweep();
    expect(() => g.handle(token, 'poll', 0)).toThrow();
  });
});

it('routes HTTP JSON requests through the gateway and rejects malformed bodies', async () => {
  const { Readable } = await import('node:stream');
  const { createSignalingHttpServer } = await import('../src/http');
  const server = createSignalingHttpServer();
  const request = (
    url: string,
    body: string,
    token?: string,
  ): Promise<{ status: number; body: Record<string, unknown> }> =>
    new Promise((resolve) => {
      const req = Object.assign(Readable.from([Buffer.from(body)]), {
        method: 'POST',
        url,
        headers: { authorization: token ? `Bearer ${token}` : undefined },
      });
      let status = 0;
      const res = {
        writeHead: (value: number) => {
          status = value;
        },
        end: (value: string) => resolve({ status, body: JSON.parse(value) }),
      };
      server.emit('request', req, res);
    });
  try {
    const opened = await request('/connect', 'null');
    expect(opened.status).toBe(200);
    const token = opened.body.token as string;
    expect((await request('/send', JSON.stringify({ type: 'create-room' }), token)).status).toBe(
      200,
    );
    const polled = await request('/poll', '0', token);
    expect(polled.body.events).toEqual([
      expect.objectContaining({ event: expect.objectContaining({ type: 'room-created' }) }),
    ]);
    expect((await request('/send', '{broken', token)).status).toBe(400);
    expect((await request('/send', '"' + 'x'.repeat(65536) + '"', token)).status).toBe(413);
    await request('/close', 'null', token);
    expect((await request('/poll', '0', token)).status).toBe(400);
  } finally {
    server.emit('close');
  }
});
