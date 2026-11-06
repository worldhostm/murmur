import type { AgeGate } from '@murmur/shared-types';
import type { QueuedUser } from './types';

export interface BlockList {
  isBlocked(a: string, b: string): boolean;
  block(blocker: string, target: string): void;
}

/** 메모리 차단 목록. 어느 한쪽이 차단했으면 양방향으로 막힌다. */
export class InMemoryBlockList implements BlockList {
  private readonly blocks = new Map<string, Set<string>>();

  block(blocker: string, target: string): void {
    let set = this.blocks.get(blocker);
    if (!set) {
      set = new Set();
      this.blocks.set(blocker, set);
    }
    set.add(target);
  }

  isBlocked(a: string, b: string): boolean {
    return (this.blocks.get(a)?.has(b) ?? false) || (this.blocks.get(b)?.has(a) ?? false);
  }
}

export class AgeRestrictedError extends Error {
  constructor(ageGate: AgeGate) {
    super(`랜덤 매칭은 성인 인증 사용자만 가능합니다 (ageGate=${ageGate})`);
    this.name = 'AgeRestrictedError';
  }
}

/**
 * FIFO 랜덤 매칭 큐.
 * - 18세 미만·미인증 사용자는 거부한다 (PLANNING.md "미성년자").
 * - 서로 차단한 사용자끼리는 짝짓지 않는다.
 */
export class Matchmaker {
  private readonly queue: QueuedUser[] = [];

  constructor(
    private readonly blockList: BlockList,
    private readonly now: () => number = Date.now,
  ) {}

  enqueue(user: { id: string; ageGate: AgeGate }): void {
    if (user.ageGate !== 'adult') throw new AgeRestrictedError(user.ageGate);
    if (this.queue.some((q) => q.id === user.id)) return;
    this.queue.push({ id: user.id, ageGate: user.ageGate, enqueuedAt: this.now() });
  }

  dequeue(userId: string): boolean {
    const idx = this.queue.findIndex((q) => q.id === userId);
    if (idx < 0) return false;
    this.queue.splice(idx, 1);
    return true;
  }

  isQueued(userId: string): boolean {
    return this.queue.some((q) => q.id === userId);
  }

  get size(): number {
    return this.queue.length;
  }

  /** 가장 오래 기다린 사용자부터, 차단 관계가 없는 첫 상대와 짝짓는다. */
  tryMatch(): [QueuedUser, QueuedUser] | null {
    for (let i = 0; i < this.queue.length; i++) {
      for (let j = i + 1; j < this.queue.length; j++) {
        const a = this.queue[i]!;
        const b = this.queue[j]!;
        if (this.blockList.isBlocked(a.id, b.id)) continue;
        this.queue.splice(j, 1);
        this.queue.splice(i, 1);
        return [a, b];
      }
    }
    return null;
  }
}
