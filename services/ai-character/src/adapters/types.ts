/**
 * 외부 공급자 어댑터 인터페이스 (ADR 0004).
 * STT·LLM·TTS 는 모두 이 인터페이스 뒤에 둔다. 공급자를 바꿔도 구현 하나만 바꾼다.
 * 사용자의 표정은 원본 영상이 아니라 face-protocol 프레임에서 뽑은 수치(ExpressionSignals)로만 받는다.
 */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** 사용자 표정 신호. 모두 0..1. 원본 영상은 절대 포함하지 않는다. */
export interface ExpressionSignals {
  smile: number;
  frown: number;
  gazeAway: number;
  fatigue: number;
}

export interface SttChunk {
  text: string;
  isFinal: boolean;
}

export interface SpeechToTextAdapter {
  transcribe(audio: AsyncIterable<Uint8Array>): AsyncIterable<SttChunk>;
}

export interface LlmRequest {
  system: string;
  messages: ChatMessage[];
  userSignals: ExpressionSignals;
}

export interface LlmAdapter {
  /** 토큰 단위 스트리밍. 응답 지연을 줄이기 위해 TTS 로 바로 이어 붙인다. */
  stream(req: LlmRequest): AsyncIterable<string>;
}

/** Oculus viseme 집합. */
export const VISEME_SHAPES = [
  'sil',
  'PP',
  'FF',
  'TH',
  'DD',
  'kk',
  'CH',
  'SS',
  'nn',
  'RR',
  'aa',
  'E',
  'ih',
  'oh',
  'ou',
] as const;
export type VisemeShape = (typeof VISEME_SHAPES)[number];

export interface Viseme {
  /** 합성 음성 시작 기준 ms. */
  timeMs: number;
  shape: VisemeShape;
  /** 0..1 */
  weight: number;
}

export interface TtsChunk {
  audio: Uint8Array;
  visemes: Viseme[];
}

export interface TextToSpeechAdapter {
  synthesize(text: string, voiceId: string): AsyncIterable<TtsChunk>;
}
