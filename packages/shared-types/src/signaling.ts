import type { AgeGate, CallMode, ReportReason } from './index';

/** 클라이언트 → 서버. 전송 계층(WebSocket 등)은 어댑터가 담당한다. */
export type ClientMessage =
  | { type: 'join-random'; ageGate: AgeGate }
  | { type: 'leave-queue' }
  | { type: 'create-room'; maxParticipants?: number }
  | { type: 'join-room'; code: string }
  | { type: 'leave' }
  | { type: 'offer'; to: string; sdp: string }
  | { type: 'answer'; to: string; sdp: string }
  | { type: 'ice'; to: string; candidate: string }
  | { type: 'report'; targetId: string; reason: ReportReason; sessionId: string }
  | { type: 'block'; targetId: string };

/** 서버 → 클라이언트. */
export type ServerEvent =
  | { type: 'matched'; sessionId: string; peerId: string; mode: CallMode }
  | { type: 'peer-joined'; sessionId: string; peerId: string }
  | { type: 'peer-left'; sessionId: string; peerId: string }
  | { type: 'room-created'; sessionId: string; code: string }
  | { type: 'offer'; from: string; sdp: string }
  | { type: 'answer'; from: string; sdp: string }
  | { type: 'ice'; from: string; candidate: string }
  | { type: 'reported'; reportId: string }
  | { type: 'error'; code: ErrorCode; message: string };

export type ErrorCode =
  | 'age-restricted'
  | 'already-queued'
  | 'room-not-found'
  | 'room-full'
  | 'not-in-session'
  | 'invalid-message';
