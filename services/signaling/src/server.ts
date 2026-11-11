import { randomUUID } from 'node:crypto';
import type { CallMode } from '@murmur/shared-types';
import { AgeRestrictedError, InMemoryBlockList, Matchmaker, type BlockList } from './matchmaker';
import { ReportStore } from './moderation';
import { RoomFullError, RoomNotFoundError, RoomRegistry } from './rooms';
import type { ClientMessage, ErrorCode, ServerEvent } from './types';

export type MessageHandler = (userId: string, message: ClientMessage) => void;

/** 전송 어댑터. WebSocket, 테스트용 메모리 전송 등으로 교체한다. */
export interface Transport {
  onMessage(handler: MessageHandler): void;
  send(userId: string, event: ServerEvent): void;
  /** 연결 끊김 알림. 없으면 leave 메시지로만 정리한다. */
  onDisconnect?(handler: (userId: string) => void): void;
}

/** 테스트용 메모리 전송. 보낸 이벤트를 사용자별로 쌓는다. */
export class InMemoryTransport implements Transport {
  private handler: MessageHandler | null = null;
  private disconnectHandler: ((userId: string) => void) | null = null;
  readonly outbox = new Map<string, ServerEvent[]>();

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }
  onDisconnect(handler: (userId: string) => void): void {
    this.disconnectHandler = handler;
  }
  send(userId: string, event: ServerEvent): void {
    const list = this.outbox.get(userId) ?? [];
    list.push(event);
    this.outbox.set(userId, list);
  }
  /** 클라이언트 역할: 메시지 주입. */
  receive(userId: string, message: ClientMessage): void {
    this.handler?.(userId, message);
  }
  disconnect(userId: string): void {
    this.disconnectHandler?.(userId);
  }
  eventsFor(userId: string): ServerEvent[] {
    return this.outbox.get(userId) ?? [];
  }
}

interface RandomPair {
  sessionId: string;
  users: [string, string];
}

export interface SignalingServer {
  readonly matchmaker: Matchmaker;
  readonly rooms: RoomRegistry;
  readonly reports: ReportStore;
  readonly blockList: BlockList;
  /** 사용자가 속한 세션 ID (랜덤 매칭 또는 방). */
  sessionOf(userId: string): string | undefined;
}

export interface SignalingServerOptions {
  transport: Transport;
  blockList?: BlockList;
  newId?: () => string;
  now?: () => number;
}

export function createSignalingServer(opts: SignalingServerOptions): SignalingServer {
  const { transport } = opts;
  const newId = opts.newId ?? randomUUID;
  const now = opts.now ?? Date.now;
  const blockList = opts.blockList ?? new InMemoryBlockList();
  const matchmaker = new Matchmaker(blockList, now);
  const rooms = new RoomRegistry(newId, now);
  const reports = new ReportStore(newId, now);
  const randomPairs = new Map<string, RandomPair>(); // userId → pair

  const error = (userId: string, code: ErrorCode, message: string): void =>
    transport.send(userId, { type: 'error', code, message });

  const peersOf = (userId: string): { sessionId: string; peers: string[] } | undefined => {
    const pair = randomPairs.get(userId);
    if (pair) return { sessionId: pair.sessionId, peers: pair.users.filter((u) => u !== userId) };
    const room = rooms.findByUser(userId);
    if (room)
      return { sessionId: room.sessionId, peers: room.participants.filter((p) => p !== userId) };
    return undefined;
  };

  const leave = (userId: string): void => {
    matchmaker.dequeue(userId);
    const pair = randomPairs.get(userId);
    if (pair) {
      for (const u of pair.users) randomPairs.delete(u);
      const other = pair.users.find((u) => u !== userId);
      if (other)
        transport.send(other, { type: 'peer-left', sessionId: pair.sessionId, peerId: userId });
      return;
    }
    const room = rooms.findByUser(userId);
    if (room) {
      const remaining = rooms.leave(room.code, userId);
      for (const p of remaining?.participants ?? []) {
        transport.send(p, { type: 'peer-left', sessionId: room.sessionId, peerId: userId });
      }
    }
  };

  const relay = (
    from: string,
    to: string,
    event: Extract<ServerEvent, { type: 'offer' | 'answer' | 'ice' }>,
  ): void => {
    const ctx = peersOf(from);
    if (!ctx || !ctx.peers.includes(to)) {
      error(from, 'not-in-session', '같은 세션의 상대에게만 보낼 수 있습니다');
      return;
    }
    transport.send(to, event);
  };

  transport.onMessage((userId, msg) => {
    switch (msg.type) {
      case 'join-random': {
        if (peersOf(userId)) return error(userId, 'invalid-message', '이미 세션에 참여 중입니다');
        try {
          matchmaker.enqueue({ id: userId, ageGate: msg.ageGate });
        } catch (e) {
          if (e instanceof AgeRestrictedError) return error(userId, 'age-restricted', e.message);
          throw e;
        }
        const pair = matchmaker.tryMatch();
        if (!pair) return;
        const mode: CallMode = 'random-match';
        const sessionId = newId();
        const users: [string, string] = [pair[0].id, pair[1].id];
        for (const u of users) randomPairs.set(u, { sessionId, users });
        transport.send(users[0], { type: 'matched', sessionId, peerId: users[1], mode });
        transport.send(users[1], { type: 'matched', sessionId, peerId: users[0], mode });
        return;
      }
      case 'leave-queue':
        matchmaker.dequeue(userId);
        return;
      case 'create-room': {
        if (peersOf(userId)) return error(userId, 'invalid-message', '이미 세션에 참여 중입니다');
        matchmaker.dequeue(userId);
        const room = rooms.create(userId, msg.maxParticipants);
        transport.send(userId, {
          type: 'room-created',
          sessionId: room.sessionId,
          code: room.code,
        });
        return;
      }
      case 'join-room': {
        if (peersOf(userId)) return error(userId, 'invalid-message', '이미 세션에 참여 중입니다');
        try {
          const existing = rooms.get(msg.code);
          if (existing?.participants.some((p) => blockList.isBlocked(p, userId))) {
            return error(userId, 'room-not-found', '입장할 수 없는 방입니다');
          }
          const room = rooms.join(msg.code, userId);
          matchmaker.dequeue(userId);
          for (const p of room.participants) {
            if (p !== userId)
              transport.send(p, { type: 'peer-joined', sessionId: room.sessionId, peerId: userId });
          }
          for (const p of room.participants) {
            if (p !== userId)
              transport.send(userId, { type: 'peer-joined', sessionId: room.sessionId, peerId: p });
          }
        } catch (e) {
          if (e instanceof RoomNotFoundError) return error(userId, 'room-not-found', e.message);
          if (e instanceof RoomFullError) return error(userId, 'room-full', e.message);
          throw e;
        }
        return;
      }
      case 'leave':
        leave(userId);
        return;
      case 'offer':
        relay(userId, msg.to, { type: 'offer', from: userId, sdp: msg.sdp });
        return;
      case 'answer':
        relay(userId, msg.to, { type: 'answer', from: userId, sdp: msg.sdp });
        return;
      case 'ice':
        relay(userId, msg.to, { type: 'ice', from: userId, candidate: msg.candidate });
        return;
      case 'report': {
        const ctx = peersOf(userId);
        if (!ctx || ctx.sessionId !== msg.sessionId || !ctx.peers.includes(msg.targetId)) {
          return error(userId, 'not-in-session', '현재 세션의 상대만 신고할 수 있습니다');
        }
        const rec = reports.record({
          reporterId: userId,
          targetId: msg.targetId,
          reason: msg.reason,
          sessionId: msg.sessionId,
        });
        transport.send(userId, { type: 'reported', reportId: rec.id });
        return;
      }
      case 'block':
        blockList.block(userId, msg.targetId);
        if (peersOf(userId)?.peers.includes(msg.targetId)) leave(userId);
        return;
      default:
        error(userId, 'invalid-message', '알 수 없는 메시지');
    }
  });
  transport.onDisconnect?.(leave);

  return {
    matchmaker,
    rooms,
    reports,
    blockList,
    sessionOf: (userId) => peersOf(userId)?.sessionId,
  };
}
