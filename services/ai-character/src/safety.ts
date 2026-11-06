import {
  CRISIS_HOTLINE_KR,
  SOLO_LATE_NIGHT_END_HOUR,
  SOLO_LATE_NIGHT_START_HOUR,
  SOLO_LONG_SESSION_MINUTES,
} from '@murmur/shared-types';

/**
 * 위기 신호 키워드. 보수적으로(놓치는 쪽보다 잡는 쪽으로) 부분 일치시킨다.
 * 실제 분류기는 어댑터로 바꿀 수 있게 하되, 이 목록은 항상 1차 안전망으로 남긴다.
 */
export const CRISIS_KEYWORDS: readonly string[] = [
  '자살',
  '죽고 싶',
  '죽고싶',
  '죽어버리',
  '자해',
  '극단적',
  '사라지고 싶',
  '살기 싫',
  '목숨을',
  'kill myself',
  'suicide',
  'self-harm',
  'self harm',
  'want to die',
  'end my life',
];

export function detectCrisis(text: string): boolean {
  const t = text.toLowerCase();
  return CRISIS_KEYWORDS.some((k) => t.includes(k.toLowerCase()));
}

/**
 * 위기 안내 문구. 캐릭터 말투가 아니라 서비스의 차분한 말투로 쓴다 (DESIGN_SYSTEM.md §9).
 */
export function crisisResponse(): string {
  return [
    '지금 많이 힘드신 것 같아요. 혼자 견디지 않으셔도 돼요.',
    `지금 바로 이야기할 수 있는 곳이 있어요. 자살예방 상담전화 ${CRISIS_HOTLINE_KR}번은 24시간 연결돼요.`,
    '원하시면 여기서 계속 이야기해도 괜찮아요. 저는 AI 캐릭터라 전문 상담을 대신할 수는 없지만, 곁에 있을게요.',
  ].join(' ');
}

export interface RestCheckInput {
  sessionMinutes: number;
  /** 현지 시각의 시(0..23). */
  localHour: number;
}

/** 장시간·심야 사용에는 부드러운 휴식 권유를 넣는다. 체류 시간을 늘리는 설계는 하지 않는다. */
export function shouldSuggestRest(input: RestCheckInput): boolean {
  if (input.sessionMinutes >= SOLO_LONG_SESSION_MINUTES) return true;
  const h = input.localHour;
  return h >= SOLO_LATE_NIGHT_START_HOUR && h < SOLO_LATE_NIGHT_END_HOUR;
}

export function restSuggestion(): string {
  return '오늘 이야기는 여기 남겨 둘게요. 조금 쉬었다가 다시 와도 괜찮아요.';
}
