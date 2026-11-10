import type { ChatReply, ChatReplyAdapter, ChatReplyRequest } from './types';

/**
 * 1차(원격)가 실패하면 경고 로그를 남기고 2차(스크립트)로 답한다.
 * 서버가 꺼져 있어도 채팅이 멈추지 않게 하되, 실패를 숨기지는 않는다.
 */
export class FallbackReplyAdapter implements ChatReplyAdapter {
  readonly kind: ChatReplyAdapter['kind'];
  /** 마지막 답을 어느 어댑터가 냈는지. */
  lastSource: 'primary' | 'fallback' | null = null;

  constructor(
    private readonly primary: ChatReplyAdapter,
    private readonly fallback: ChatReplyAdapter,
    private readonly warn: (message: string) => void = (m) => console.warn(m),
  ) {
    this.kind = primary.kind;
  }

  async reply(req: ChatReplyRequest): Promise<ChatReply> {
    try {
      const out = await this.primary.reply(req);
      this.lastSource = 'primary';
      return out;
    } catch (e) {
      this.warn(
        `[chat] ${this.primary.kind} 답 실패, ${this.fallback.kind} 로 대체: ${(e as Error).message}`,
      );
      const out = await this.fallback.reply(req);
      this.lastSource = 'fallback';
      return out;
    }
  }
}
