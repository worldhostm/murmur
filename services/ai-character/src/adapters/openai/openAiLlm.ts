import type { ChatMessage, LlmAdapter, LlmRequest } from '../types';

export interface OpenAiLlmOptions {
  apiKey: string;
  /** 기본 gpt-4o-mini. OPENAI_MODEL 로 바꾼다. */
  model?: string;
  /** 기본 https://api.openai.com/v1 */
  baseUrl?: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** 응답 전체 제한. 기본 20초. */
  timeoutMs?: number;
  /** 테스트 주입. 기본 전역 fetch. */
  fetch?: typeof fetch;
}

export class OpenAiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'OpenAiError';
  }
}

interface ChatCompletionChunk {
  choices?: { delta?: { content?: string | null } }[];
}

/**
 * OpenAI Chat Completions 스트리밍 어댑터 (ADR 0004 의 LlmAdapter 구현).
 * SDK 없이 fetch + SSE 파싱만 쓴다. 키와 응답 원문은 로그에 남기지 않는다.
 */
export class OpenAiLlm implements LlmAdapter {
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: OpenAiLlmOptions) {
    if (!opts.apiKey) throw new Error('OpenAiLlm: apiKey 가 비어 있다');
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? 'gpt-4o-mini';
    this.baseUrl = (opts.baseUrl ?? 'https://api.openai.com/v1').replace(/\/+$/, '');
    this.temperature = opts.temperature ?? 0.8;
    this.maxOutputTokens = opts.maxOutputTokens ?? 300;
    this.timeoutMs = opts.timeoutMs ?? 20_000;
    this.fetchImpl = opts.fetch ?? fetch;
  }

  async *stream(req: LlmRequest): AsyncIterable<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const messages: ChatMessage[] = [{ role: 'system', content: req.system }, ...req.messages];
      let res: Response;
      try {
        res = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${this.apiKey}` },
          body: JSON.stringify({
            model: this.model,
            messages,
            stream: true,
            temperature: this.temperature,
            max_tokens: this.maxOutputTokens,
          }),
          signal: controller.signal,
        });
      } catch (e) {
        throw new OpenAiError(
          0,
          controller.signal.aborted ? '응답 시간 초과' : `요청 실패: ${(e as Error).message}`,
        );
      }
      if (!res.ok) {
        throw new OpenAiError(res.status, `OpenAI 응답 ${res.status}`);
      }
      if (!res.body) throw new OpenAiError(res.status, '응답 본문이 없다');

      for await (const data of sseData(res.body)) {
        if (data === '[DONE]') return;
        let chunk: ChatCompletionChunk;
        try {
          chunk = JSON.parse(data) as ChatCompletionChunk;
        } catch {
          continue; // 깨진 조각은 건너뛴다
        }
        const token = chunk.choices?.[0]?.delta?.content;
        if (token) yield token;
      }
    } finally {
      clearTimeout(timer);
    }
  }
}

/** SSE 바이트 스트림에서 `data:` 줄의 값만 차례로 낸다. 여러 줄 data 는 줄바꿈으로 잇는다. */
async function* sseData(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = '';
  let dataLines: string[] = [];
  const flush = (): string | null => {
    if (dataLines.length === 0) return null;
    const joined = dataLines.join('\n');
    dataLines = [];
    return joined;
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, '');
        buffer = buffer.slice(nl + 1);
        if (line === '') {
          const event = flush();
          if (event !== null) yield event;
        } else if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).replace(/^ /, ''));
        }
        // 그 밖(event:, id:, 주석)은 무시
      }
    }
    const tail = flush();
    if (tail !== null) yield tail;
  } finally {
    reader.releaseLock();
  }
}
