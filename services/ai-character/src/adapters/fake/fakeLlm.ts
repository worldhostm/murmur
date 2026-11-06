import type { LlmAdapter, LlmRequest } from '../types';

export interface FakeLlmOptions {
  /** 호출 순서대로 낼 응답. 다 쓰면 마지막 사용자 메시지를 되풀이한다. */
  script?: string[];
  /** 토큰 분할 크기 (문자 수). */
  chunkSize?: number;
}

/** 테스트용 LLM. 호출 기록을 남겨 위기 경로가 LLM 을 건너뛰는지 검증한다. */
export class FakeLlm implements LlmAdapter {
  readonly calls: LlmRequest[] = [];
  private cursor = 0;
  private readonly script: string[];
  private readonly chunkSize: number;

  constructor(opts: FakeLlmOptions = {}) {
    this.script = opts.script ?? [];
    this.chunkSize = opts.chunkSize ?? 4;
  }

  async *stream(req: LlmRequest): AsyncIterable<string> {
    this.calls.push(req);
    const scripted = this.script[this.cursor];
    this.cursor += 1;
    const lastUser = [...req.messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    const text = scripted ?? `그랬구나. "${lastUser}" 라고 했지.`;
    for (let i = 0; i < text.length; i += this.chunkSize) {
      yield text.slice(i, i + this.chunkSize);
    }
  }
}
