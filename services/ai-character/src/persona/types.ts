import type { AiCharacterId } from '@murmur/shared-types';

/** 캐릭터 설정. 원문 문서는 characters/<id>.md, 이 타입은 프롬프트 생성용 요약이다. */
export interface CharacterPersona {
  id: AiCharacterId;
  name: string;
  /** 세계관 한 단락. */
  world: string;
  /** TTS voiceId. 공급자별 매핑은 어댑터가 한다. */
  voice: string;
  speechStyle: string;
  /** 솔로 모드에서 맡는 역할. */
  soloRole: string;
  exampleLines: string[];
  /** 무엇을 기억하는지. */
  memoryScope: string[];
  forbidden: string[];
  crisisProtocol: string;
}
