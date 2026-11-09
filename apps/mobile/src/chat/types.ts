import type { AiCharacterId } from '@murmur/shared-types';
import type { SpriteExpression } from '@murmur/expression-cues';

export interface ChatTurn {
  from: 'me' | 'character';
  text: string;
}

export interface ChatReplyRequest {
  characterId: AiCharacterId;
  /** 지금까지의 대화 (이번 메시지 제외). */
  history: readonly ChatTurn[];
  text: string;
}

export interface ChatReply {
  text: string;
  /** 캐릭터가 이 답을 하며 짓는 표정. 없으면 앱이 텍스트에서 추정한다. */
  expression?: SpriteExpression;
  /** true 면 캐릭터 연기를 멈추고 위기 안내를 냈다. */
  crisis?: boolean;
}

/**
 * 솔로 채팅 답 어댑터 (CLAUDE.md "외부 의존성 격리"). services/ai-character 가 네트워크로 붙으면 구현 하나만 바꾼다.
 * 지금은 ScriptedReplyAdapter 가 자리표시자다.
 */
export interface ChatReplyAdapter {
  readonly kind: 'scripted' | 'remote';
  reply(req: ChatReplyRequest): Promise<ChatReply>;
}
