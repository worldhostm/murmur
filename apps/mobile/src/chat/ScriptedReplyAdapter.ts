import type { AiCharacterId } from '@murmur/shared-types';
import { cueFromText } from '@murmur/expression-cues';
import type { SpriteExpression } from '@murmur/expression-cues';
import type { ChatReply, ChatReplyAdapter, ChatReplyRequest } from './types';

/** 사용자 단서를 묶은 답 그룹. i18n 키 reply.<characterId>.<group> 에 줄이 있다. */
export type ReplyGroup = 'down' | 'up' | 'neutral';

const GROUP_BY_CUE: Record<SpriteExpression, ReplyGroup> = {
  neutral: 'neutral',
  softSmile: 'neutral',
  smile: 'up',
  bigSmile: 'up',
  serious: 'neutral',
  surprised: 'neutral',
  flustered: 'neutral',
  worried: 'down',
  sad: 'down',
  angry: 'down',
};

/**
 * 위기 키워드. services/ai-character/src/safety.ts 의 CRISIS_KEYWORDS 와 같은 목록 (앱은 services 를 import 할 수 없다).
 * 서비스가 붙으면 서버 판정을 쓰고 이 목록은 지운다.
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

export interface ScriptedReplyOptions {
  /** 캐릭터·그룹의 대사 목록. 보통 i18n 의 reply.<id>.<group>. */
  lines: (characterId: AiCharacterId, group: ReplyGroup) => readonly string[];
  /** 위기 안내 문구 (safety.crisisBody). */
  crisisText: () => string;
  /** 답 지연 범위 ms. 기본 600~1200. 테스트는 [0, 0]. */
  delayMs?: readonly [number, number];
  random?: () => number;
}

/**
 * ai-character 서비스가 붙기 전까지의 자리표시자. 사용자 말의 단서 그룹에 맞는 캐릭터 대사를 돌아가며 고르고,
 * 그룹에 맞는 표정을 함께 돌려준다. 위기 키워드가 보이면 캐릭터 연기 대신 안내 문구를 낸다 (PLANNING.md 솔로 모드 원칙).
 */
export class ScriptedReplyAdapter implements ChatReplyAdapter {
  readonly kind = 'scripted' as const;
  private readonly cursor = new Map<string, number>();
  private readonly delay: readonly [number, number];
  private readonly random: () => number;

  constructor(private readonly opts: ScriptedReplyOptions) {
    this.delay = opts.delayMs ?? [600, 1200];
    this.random = opts.random ?? Math.random;
  }

  async reply(req: ChatReplyRequest): Promise<ChatReply> {
    await this.wait();
    if (detectCrisis(req.text)) {
      return { text: this.opts.crisisText(), expression: 'worried', crisis: true };
    }
    const cue = cueFromText(req.text);
    const group = GROUP_BY_CUE[cue];
    const lines = this.opts.lines(req.characterId, group);
    const key = `${req.characterId}/${group}`;
    const index = this.cursor.get(key) ?? 0;
    this.cursor.set(key, index + 1);
    const text = lines.length > 0 ? lines[index % lines.length]! : '';
    return { text, expression: expressionFor(group, cue) };
  }

  private wait(): Promise<void> {
    const [min, max] = this.delay;
    const ms = min + (max - min) * this.random();
    return ms <= 0 ? Promise.resolve() : new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function expressionFor(group: ReplyGroup, cue: SpriteExpression): SpriteExpression {
  if (group === 'down') return 'worried';
  if (group === 'up') return cue === 'bigSmile' ? 'bigSmile' : 'smile';
  return 'softSmile';
}
