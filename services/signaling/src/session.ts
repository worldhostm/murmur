import type { CallMode, CallSession, CallState, Participant } from '@murmur/shared-types';

const TRANSITIONS: Record<CallState, readonly CallState[]> = {
  idle: ['connecting'],
  connecting: ['connected', 'ended'],
  connected: ['reconnecting', 'ended'],
  reconnecting: ['connected', 'ended'],
  ended: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: CallState, to: CallState) {
    super(`세션 상태 전이 불가: ${from} → ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

export function canTransition(from: CallState, to: CallState): boolean {
  return TRANSITIONS[from].includes(to);
}

export function createSession(
  id: string,
  mode: CallMode,
  participants: Participant[],
): CallSession {
  return { id, mode, state: 'idle', participants };
}

/** 상태를 바꾼 새 세션 객체를 돌려준다. 잘못된 전이는 throw. */
export function transition(
  session: CallSession,
  to: CallState,
  now: () => number = Date.now,
): CallSession {
  if (!canTransition(session.state, to)) throw new InvalidTransitionError(session.state, to);
  const next: CallSession = { ...session, state: to };
  if (to === 'connected' && session.startedAt === undefined) next.startedAt = now();
  if (to === 'ended') next.endedAt = now();
  return next;
}
