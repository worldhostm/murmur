import type { AiCharacterId } from '@murmur/shared-types';
import { isSpriteExpression } from '@murmur/expression-cues';
import type { ChatReply, ChatReplyAdapter, ChatReplyRequest } from './types';

export interface RemoteReplyOptions {
  /** ai-character 서버 주소 (예: http://10.0.2.2:8787). 끝의 / 는 뗀다. */
  baseUrl: string;
  /** 서버 쪽 대화 기록을 잇는 키. 기본은 어댑터마다 새로 만든다. */
  sessionId?: string;
  adultVerified?: boolean;
  /** 기본 25초. */
  timeoutMs?: number;
  /** 테스트 주입. 기본 전역 fetch. */
  fetch?: typeof fetch;
}

export class RemoteReplyError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'RemoteReplyError';
  }
}

function newSessionId(): string {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * services/ai-character 의 `POST /chat` 을 부르는 답 어댑터. 대화 기록은 서버가 sessionId 로 잇는다.
 * 앱은 서비스 코드를 import 하지 않고 HTTP 로만 연결한다 (CLAUDE.md 모듈 경계).
 */
export class RemoteReplyAdapter implements ChatReplyAdapter {
  readonly kind = 'remote' as const;
  readonly sessionId: string;
  private readonly baseUrl: string;
  private readonly adultVerified: boolean;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: RemoteReplyOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.sessionId = opts.sessionId ?? newSessionId();
    this.adultVerified = opts.adultVerified ?? false;
    this.timeoutMs = opts.timeoutMs ?? 25_000;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  async reply(req: ChatReplyRequest): Promise<ChatReply> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      let res: Response;
      try {
        res = await this.fetchImpl(`${this.baseUrl}/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            characterId: req.characterId satisfies AiCharacterId,
            text: req.text,
            adultVerified: this.adultVerified,
          }),
          signal: controller.signal,
        });
      } catch (e) {
        throw new RemoteReplyError(
          0,
          controller.signal.aborted ? '응답 시간 초과' : `연결 실패: ${(e as Error).message}`,
        );
      }
      if (!res.ok) throw new RemoteReplyError(res.status, `서버 응답 ${res.status}`);
      const data = (await res.json()) as Record<string, unknown>;
      if (typeof data.text !== 'string')
        throw new RemoteReplyError(res.status, '응답에 text 가 없다');
      const reply: ChatReply = { text: data.text };
      if (isSpriteExpression(data.expression)) reply.expression = data.expression;
      if (data.crisis === true) reply.crisis = true;
      return reply;
    } finally {
      clearTimeout(timer);
    }
  }
}
