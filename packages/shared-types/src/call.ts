import type { AiCharacterId } from './character';

/** 대화 모드 (PLANNING.md 시나리오 A/B/C). */
export type CallMode = 'solo' | 'ai-call' | 'random-match' | 'room';

export type CallState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'ended';

/** 네트워크 품질. 표정 수치만 보내므로 약해도 끊기지 않고 표정이 잠시 굳는다. */
export type NetworkQuality = 'good' | 'weak' | 'lost';

export interface Participant {
  id: string;
  /** 상대가 AI 캐릭터인지. true면 화면에 항상 "AI 캐릭터" 표시를 둔다 (금지 사항). */
  isAi: boolean;
  aiCharacterId?: AiCharacterId;
  avatarId: string;
  displayNameKey?: string;
  displayName?: string;
}

export interface CallSession {
  id: string;
  mode: CallMode;
  state: CallState;
  participants: Participant[];
  startedAt?: number;
  endedAt?: number;
}
