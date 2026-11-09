import type { SpriteExpression } from './expressions';

/**
 * 글 → 표정 단서. 한/영 키워드·이모지·문장부호를 범주별로 점수 내고 가장 높은 범주를 고른다.
 * 동점은 강한 감정 우선 (angry > sad > surprised > worried > flustered > bigSmile > smile > serious).
 * LLM 이 감정 태그를 직접 내기 전까지의 휴리스틱이며, 모르면 neutral.
 */
type ScoredExpression = Exclude<SpriteExpression, 'neutral' | 'softSmile'>;

const PRIORITY: readonly ScoredExpression[] = ['angry', 'sad', 'surprised', 'worried', 'flustered', 'bigSmile', 'smile', 'serious'];

const KEYWORDS: Record<ScoredExpression, readonly string[]> = {
  angry: ['화나', '화났', '화가 나', '짜증', '빡쳐', '빡치', '열받', '열 받', '미치겠', '최악', '꺼져', '싫어', '빡침', 'angry', 'furious', 'pissed', 'hate', 'annoying', 'mad at', '😡', '🤬', '💢'],
  sad: ['슬퍼', '슬프', '우울', '눈물', '울었', '울고', '힘들', '힘든', '외로', '지쳤', '지친', '허무', '그리워', '보고 싶', '보고싶', '서러', '속상', 'sad', 'cry', 'crying', 'lonely', 'depressed', 'miss you', 'exhausted', 'hurts', '😢', '😭', '💔', '😞'],
  surprised: ['헐', '대박', '뭐라고', '깜짝', '놀랐', '놀라', '세상에', '말도 안', '진짜?', '정말?', 'wow', 'omg', 'no way', 'really?', 'seriously?', 'what?!', '😮', '😲', '🤯', '😱'],
  worried: ['걱정', '불안', '무서', '두려', '긴장', '떨려', '어떡하지', '어떡해', '어쩌지', '괜찮을까', '망하면', 'worried', 'anxious', 'nervous', 'scared', 'afraid', 'what if', '😰', '😟', '😨'],
  flustered: ['당황', '민망', '부끄', '창피', '어색', '헉', '아 몰라', '모르겠', '어버버', 'embarrassed', 'awkward', 'oops', 'flustered', '😳', '😅', '🙈'],
  bigSmile: ['최고', '완전 좋', '너무 좋', '신난', '신나', '행복', '사랑해', '짱', '대박 좋', 'lol', 'haha', 'awesome', 'love it', 'love this', 'amazing', 'so happy', 'best day', '😂', '🤣', '😆', '🥳', '❤️', '😍'],
  smile: ['좋아', '좋았', '좋네', '고마워', '고맙', '감사', '재밌', '재미있', '기분 좋', '다행', '괜찮아', '편해', '뿌듯', 'thanks', 'thank you', 'nice', 'glad', 'happy', 'fun', 'good', 'better', '😊', '🙂', '😄', '👍', '🙏'],
  serious: ['진지', '생각해 보니', '생각해보니', '중요', '결정', '집중', '고민', '문제', '계획', '해야 해', '해야 돼', '어떻게 하면', '정리', '단계', 'serious', 'important', 'focus', 'decide', 'problem', 'plan', 'figure out', 'step', '🤔'],
};

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let from = 0;
  for (;;) {
    const at = haystack.indexOf(needle, from);
    if (at < 0) return count;
    count++;
    from = at + needle.length;
  }
}

export function cueFromText(text: string): SpriteExpression {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) return 'neutral';

  const score: Record<ScoredExpression, number> = { angry: 0, sad: 0, surprised: 0, worried: 0, flustered: 0, bigSmile: 0, smile: 0, serious: 0 };
  for (const expression of PRIORITY) {
    for (const keyword of KEYWORDS[expression]) score[expression] += countOccurrences(normalized, keyword);
  }

  // 웃음 표기: ㅋ/ㅎ 세 개 이상이면 활짝, 두 개면 살짝.
  const laughs = Math.max(countOccurrences(normalized, 'ㅋ'), countOccurrences(normalized, 'ㅎ'));
  if (laughs >= 3) score.bigSmile += 2;
  else if (laughs === 2) score.smile += 1;
  // 울음 표기: ㅠ/ㅜ 두 개 이상이면 슬픔. 하나는 말버릇이라 세지 않는다.
  const tears = countOccurrences(normalized, 'ㅠ') + countOccurrences(normalized, 'ㅜ');
  if (tears >= 2) score.sad += 1;
  // 문장부호: ?! !? 는 놀람, !! 는 감정 전체를 조금 키운다.
  if (/[?!]{2,}/.test(normalized) && /\?!|!\?/.test(normalized)) score.surprised += 1;
  else if (/!{2,}/.test(normalized)) for (const e of PRIORITY) if (score[e] > 0) score[e] += 0.5;

  let best: ScoredExpression | null = null;
  for (const expression of PRIORITY) {
    if (score[expression] > 0 && (best === null || score[expression] > score[best])) best = expression;
  }
  return best ?? 'neutral';
}

/** 사용자 말의 단서 → 캐릭터가 듣는 동안 짓는 표정 (공감 반응). 기본은 듣는 얼굴(은은한 미소). */
const REACTION: Record<SpriteExpression, SpriteExpression> = {
  neutral: 'softSmile',
  softSmile: 'softSmile',
  smile: 'smile',
  bigSmile: 'bigSmile',
  serious: 'serious',
  surprised: 'surprised',
  flustered: 'softSmile',
  worried: 'worried',
  sad: 'worried',
  angry: 'serious',
};

export function reactionTo(userCue: SpriteExpression): SpriteExpression {
  return REACTION[userCue];
}
