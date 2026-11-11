import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { ClientMessage, ServerEvent } from '@murmur/shared-types';
import { createSignalingServer, type MessageHandler, type Transport } from './server';

interface Connection {
  userId: string;
  touched: number;
  events: { id: number; event: ServerEvent }[];
  seq: number;
}
/** Anonymous development gateway. A client claim can never grant adult access. */
export class SignalingGateway implements Transport {
  private connections = new Map<string, Connection>();
  private handler?: MessageHandler;
  private disconnected?: (id: string) => void;
  constructor(private readonly now: () => number = Date.now) {
    createSignalingServer({ transport: this });
  }
  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }
  onDisconnect(handler: (id: string) => void): void {
    this.disconnected = handler;
  }
  send(userId: string, event: ServerEvent): void {
    const conn = [...this.connections.values()].find((v) => v.userId === userId);
    if (!conn) return;
    conn.events.push({ id: ++conn.seq, event });
    if (conn.events.length > 256) this.closeUser(userId);
  }
  private closeUser(userId: string): void {
    for (const [token, conn] of this.connections) {
      if (conn.userId === userId) {
        this.connections.delete(token);
        this.disconnected?.(userId);
        return;
      }
    }
  }
  sweep(): void {
    for (const conn of this.connections.values())
      if (this.now() - conn.touched > 60_000) this.closeUser(conn.userId);
  }
  open(): { token: string } {
    this.sweep();
    if (this.connections.size >= 1000) throw new Error('Capacity reached');
    const token = randomUUID();
    this.connections.set(token, { userId: randomUUID(), touched: this.now(), events: [], seq: 0 });
    return { token };
  }
  handle(token: string, action: 'poll' | 'send' | 'close', body: unknown): unknown {
    this.sweep();
    const conn = this.connections.get(token);
    if (!conn) throw new Error('Expired connection');
    conn.touched = this.now();
    if (action === 'close') {
      this.closeUser(conn.userId);
      return {};
    }
    if (action === 'poll') {
      const after =
        typeof body === 'number' && Number.isSafeInteger(body) && body >= 0 && body <= conn.seq
          ? body
          : 0;
      conn.events = conn.events.filter((v) => v.id > after);
      return { events: conn.events, cursor: conn.seq };
    }
    const message = parseMessage(body);
    this.handler?.(conn.userId, message);
    return {};
  }
}

export function parseMessage(value: unknown): ClientMessage {
  if (!value || typeof value !== 'object') throw new Error('Invalid message');
  const v = value as Record<string, unknown>;
  switch (v.type) {
    case 'join-random':
      return { type: 'join-random', ageGate: 'unverified' };
    case 'leave':
    case 'leave-queue':
      return { type: v.type };
    case 'create-room':
      return { type: 'create-room', maxParticipants: 2 };
    case 'join-room':
      if (typeof v.code === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(v.code))
        return { type: 'join-room', code: v.code };
      break;
    case 'offer':
    case 'answer':
      if (typeof v.to === 'string' && typeof v.sdp === 'string' && v.sdp.length <= 32000)
        return { type: v.type, to: v.to, sdp: v.sdp };
      break;
    case 'ice':
      if (typeof v.to === 'string' && typeof v.candidate === 'string' && v.candidate.length <= 4000)
        return { type: 'ice', to: v.to, candidate: v.candidate };
      break;
    case 'block':
      if (typeof v.targetId === 'string') return { type: 'block', targetId: v.targetId };
      break;
    case 'report': {
      const reasons = [
        'harassment',
        'sexual',
        'hate',
        'minor',
        'impersonation',
        'self-harm-risk',
        'other',
      ];
      if (
        typeof v.targetId === 'string' &&
        typeof v.sessionId === 'string' &&
        typeof v.reason === 'string' &&
        reasons.includes(v.reason)
      )
        return v as unknown as ClientMessage;
    }
  }
  throw new Error('Invalid message');
}

export function createSignalingHttpServer(gateway = new SignalingGateway()) {
  const server = createServer(async (req, res) => {
    const respond = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method !== 'POST') {
        respond(405, { error: 'method' });
        return;
      }
      let raw = '';
      for await (const chunk of req) {
        raw += chunk.toString();
        if (Buffer.byteLength(raw) > 65536) {
          respond(413, { error: 'size' });
          return;
        }
      }
      if (req.url === '/connect') {
        respond(200, gateway.open());
        return;
      }
      const action = req.url?.slice(1);
      if (action !== 'poll' && action !== 'send' && action !== 'close') {
        respond(404, {});
        return;
      }
      const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
      respond(200, gateway.handle(token, action, raw ? JSON.parse(raw) : null));
    } catch {
      respond(400, { error: 'Invalid or expired request' });
    }
  });
  const cleanup = setInterval(() => gateway.sweep(), 15_000);
  cleanup.unref();
  server.on('close', () => clearInterval(cleanup));
  return server;
}
