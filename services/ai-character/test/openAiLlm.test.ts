import { describe, expect, it } from 'vitest';
import { OpenAiError, OpenAiLlm } from '../src/adapters/openai';
import { NEUTRAL_SIGNALS } from '../src/signals';

function sse(events: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const text = events.map((e) => `data: ${e}\n\n`).join('');
  // 일부러 이벤트 경계와 무관하게 쪼개서 보낸다.
  const parts = [text.slice(0, 7), text.slice(7, 40), text.slice(40)];
  return new ReadableStream({
    start(controller) {
      for (const p of parts) if (p) controller.enqueue(enc.encode(p));
      controller.close();
    },
  });
}

const chunk = (content: string) => JSON.stringify({ choices: [{ delta: { content } }] });

async function collect(it: AsyncIterable<string>): Promise<string> {
  let out = '';
  for await (const t of it) out += t;
  return out;
}

describe('OpenAiLlm', () => {
  it('posts a streaming chat completion with the system prompt first and joins the tokens', async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init! });
      return new Response(sse([chunk('됐고. '), chunk('뭐가 '), chunk('막혔는데.'), '[DONE]']), {
        status: 200,
      });
    }) as typeof fetch;
    const llm = new OpenAiLlm({ apiKey: 'sk-test', fetch: fetchImpl });
    const text = await collect(
      llm.stream({
        system: 'SYSTEM',
        messages: [{ role: 'user', content: '안녕' }],
        userSignals: NEUTRAL_SIGNALS,
      }),
    );
    expect(text).toBe('됐고. 뭐가 막혔는데.');
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe('https://api.openai.com/v1/chat/completions');
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.stream).toBe(true);
    expect(body.messages).toEqual([
      { role: 'system', content: 'SYSTEM' },
      { role: 'user', content: '안녕' },
    ]);
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe('Bearer sk-test');
  });

  it('honours model and baseUrl options', async () => {
    let url = '';
    let model = '';
    const fetchImpl = (async (u: string | URL | Request, init?: RequestInit) => {
      url = String(u);
      model = JSON.parse(init!.body as string).model;
      return new Response(sse(['[DONE]']), { status: 200 });
    }) as typeof fetch;
    const llm = new OpenAiLlm({
      apiKey: 'k',
      model: 'gpt-4.1-mini',
      baseUrl: 'http://localhost:1234/v1/',
      fetch: fetchImpl,
    });
    await collect(llm.stream({ system: 's', messages: [], userSignals: NEUTRAL_SIGNALS }));
    expect(url).toBe('http://localhost:1234/v1/chat/completions');
    expect(model).toBe('gpt-4.1-mini');
  });

  it('throws OpenAiError with the HTTP status on a non-2xx response', async () => {
    const fetchImpl = (async () =>
      new Response('{"error":"bad key"}', { status: 401 })) as typeof fetch;
    const llm = new OpenAiLlm({ apiKey: 'k', fetch: fetchImpl });
    await expect(
      collect(llm.stream({ system: 's', messages: [], userSignals: NEUTRAL_SIGNALS })),
    ).rejects.toMatchObject({
      name: 'OpenAiError',
      status: 401,
    });
  });

  it('aborts on timeout and reports it as OpenAiError', async () => {
    const fetchImpl = ((_u: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener('abort', () => reject(new Error('aborted')));
      })) as typeof fetch;
    const llm = new OpenAiLlm({ apiKey: 'k', timeoutMs: 10, fetch: fetchImpl });
    const err = await collect(
      llm.stream({ system: 's', messages: [], userSignals: NEUTRAL_SIGNALS }),
    ).catch((e) => e);
    expect(err).toBeInstanceOf(OpenAiError);
    expect((err as OpenAiError).message).toContain('시간 초과');
  });

  it('skips malformed chunks and empty deltas', async () => {
    const fetchImpl = (async () =>
      new Response(
        sse([
          'not json',
          chunk('a'),
          JSON.stringify({ choices: [{ delta: {} }] }),
          chunk('b'),
          '[DONE]',
        ]),
        {
          status: 200,
        },
      )) as typeof fetch;
    const llm = new OpenAiLlm({ apiKey: 'k', fetch: fetchImpl });
    expect(
      await collect(llm.stream({ system: 's', messages: [], userSignals: NEUTRAL_SIGNALS })),
    ).toBe('ab');
  });

  it('refuses an empty api key', () => {
    expect(() => new OpenAiLlm({ apiKey: '' })).toThrow();
  });
});
