import { randomInt } from 'node:crypto';

export const DEFAULT_MAX_PARTICIPANTS = 6;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동되는 I/O/0/1 제외
export const ROOM_CODE_LENGTH = 6;

export interface Room {
  code: string;
  sessionId: string;
  hostId: string;
  participants: string[];
  maxParticipants: number;
  createdAt: number;
}

export class RoomNotFoundError extends Error {
  constructor(code: string) {
    super(`방을 찾을 수 없습니다: ${code}`);
    this.name = 'RoomNotFoundError';
  }
}
export class RoomFullError extends Error {
  constructor(code: string) {
    super(`방이 가득 찼습니다: ${code}`);
    this.name = 'RoomFullError';
  }
}

export function generateRoomCode(): string {
  let s = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

/** 방(그룹 통화). 호스트가 나가면 다음 참가자에게 넘기고, 비면 폐기한다. */
export class RoomRegistry {
  private readonly rooms = new Map<string, Room>();

  constructor(
    private readonly newSessionId: () => string,
    private readonly now: () => number = Date.now,
  ) {}

  create(hostId: string, maxParticipants = DEFAULT_MAX_PARTICIPANTS): Room {
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();
    const room: Room = {
      code,
      sessionId: this.newSessionId(),
      hostId,
      participants: [hostId],
      maxParticipants,
      createdAt: this.now(),
    };
    this.rooms.set(code, room);
    return room;
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  findByUser(userId: string): Room | undefined {
    for (const r of this.rooms.values()) if (r.participants.includes(userId)) return r;
    return undefined;
  }

  join(code: string, userId: string): Room {
    const room = this.rooms.get(code);
    if (!room) throw new RoomNotFoundError(code);
    if (room.participants.includes(userId)) return room;
    if (room.participants.length >= room.maxParticipants) throw new RoomFullError(code);
    room.participants.push(userId);
    return room;
  }

  /** 나간 뒤의 방을 돌려준다. 폐기되었으면 undefined. */
  leave(code: string, userId: string): Room | undefined {
    const room = this.rooms.get(code);
    if (!room) return undefined;
    room.participants = room.participants.filter((p) => p !== userId);
    if (room.participants.length === 0) {
      this.rooms.delete(code);
      return undefined;
    }
    if (room.hostId === userId) room.hostId = room.participants[0]!;
    return room;
  }

  get size(): number {
    return this.rooms.size;
  }
}
