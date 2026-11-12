import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { FakeLlm } from '../src/adapters/fake';
import { ChatServer, parseChatBody } from '../src/server';
import type { Server } from 'node:http';

function call(
  port: number,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; json: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const payload =
      body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
    const req = request(
      { host: '127.0.0.1', port, method, path, headers: { 'content-type': 'application/json' } },
      (res) => {
        let data = '';
        res.on('data', (c: Buffer) => (data += c.toString()));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, json: data ? JSON.parse(data) : null }),
        );
      },
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('ChatServer', () => {
  let http: Server;
  let port = 0;
  let llm: FakeLlm;
  let chat: ChatServer;
  let now = 1_000_000;

  beforeAll(async () => {
    llm = new FakeLlm({ script: ['됐고. 뭐가 막혔는데.', 'ㅋㅋㅋ 완전 최고네.'] });
    chat = new ChatServer({ llm, model: 'fake', sessionTtlMs: 1000, now: () => now });
    http = chat.createHttpServer();
    await new Promise<void>((r) => http.listen(0, '127.0.0.1', r));
    port = (http.address() as AddressInfo).port;
  });
  afterAll(() => new Promise<void>((r) => http.close(() => r())));

  it('reports health with the model name', async () => {
    expect(await call(port, 'GET', '/health')).toEqual({
      status: 200,
      json: { ok: true, model: 'fake' },
    });
  });

  it('answers a chat turn with text, expression and crisis flag, and keeps history per session', async () => {
    const first = await call(port, 'POST', '/chat', {
      sessionId: 's1',
      characterId: 'sera',
      text: '오늘 막혔어',
    });
    expect(first).toEqual({
      status: 200,
      json: { text: '됐고. 뭐가 막혔는데.', expression: 'neutral', crisis: false },
    });
    const second = await call(port, 'POST', '/chat', {
      sessionId: 's1',
      characterId: 'sera',
      text: '풀렸다!',
    });
    expect(second.json).toEqual({
      text: 'ㅋㅋㅋ 완전 최고네.',
      expression: 'bigSmile',
      crisis: false,
    });
    expect(llm.calls).toHaveLength(2);
    expect(llm.calls[1]!.messages.map((m) => m.content)).toEqual([
      '오늘 막혔어',
      '됐고. 뭐가 막혔는데.',
      '풀렸다!',
    ]);
    expect(llm.calls[1]!.system).toContain('세라');
  });

  it('bypasses the LLM on crisis text', async () => {
    const before = llm.calls.length;
    const res = await call(port, 'POST', '/chat', {
      sessionId: 's2',
      characterId: 'seo-doyoon',
      text: '죽고 싶어',
    });
    expect(res.status).toBe(200);
    expect(res.json.crisis).toBe(true);
    expect(res.json.expression).toBe('worried');
    expect(res.json.text).toContain('109');
    expect(llm.calls).toHaveLength(before);
  });

  it('starts a fresh history when the same session switches character', async () => {
    const before = llm.calls.length;
    await call(port, 'POST', '/chat', { sessionId: 's1', characterId: 'han-seorin', text: '안녕' });
    expect(llm.calls[before]!.messages.map((m) => m.content)).toEqual(['안녕']);
    expect(llm.calls[before]!.system).toContain('한서린');
  });

  it('rejects bad bodies with 400', async () => {
    expect((await call(port, 'POST', '/chat', 'not json')).status).toBe(400);
    expect(
      (await call(port, 'POST', '/chat', { sessionId: 's', characterId: 'nobody', text: 'x' }))
        .status,
    ).toBe(400);
    // 출시 예정(coming-soon) 캐릭터도 받지 않는다.
    expect(
      (await call(port, 'POST', '/chat', { sessionId: 's', characterId: 'moka', text: 'x' }))
        .status,
    ).toBe(400);
    expect(
      (await call(port, 'POST', '/chat', { sessionId: 's', characterId: 'sera', text: '   ' }))
        .status,
    ).toBe(400);
    expect((await call(port, 'GET', '/nope')).status).toBe(404);
  });

  it('answers 502 when the LLM fails', async () => {
    const failing = new ChatServer({
      llm: {
        // eslint-disable-next-line require-yield
        async *stream() {
          throw Object.assign(new Error('boom'), { status: 401 });
        },
      },
    });
    const s = failing.createHttpServer();
    await new Promise<void>((r) => s.listen(0, '127.0.0.1', r));
    const p = (s.address() as AddressInfo).port;
    const res = await call(p, 'POST', '/chat', {
      sessionId: 'x',
      characterId: 'sera',
      text: '안녕',
    });
    expect(res.status).toBe(502);
    await new Promise<void>((r) => s.close(() => r()));
  });

  it('evicts sessions idle longer than the ttl', async () => {
    await call(port, 'POST', '/chat', { sessionId: 'old', characterId: 'sera', text: '하나' });
    expect(chat.sessions.has('old')).toBe(true);
    now += 2000;
    await call(port, 'POST', '/chat', { sessionId: 'new', characterId: 'sera', text: '둘' });
    expect(chat.sessions.has('old')).toBe(false);
    expect(chat.sessions.has('new')).toBe(true);
  });
});

describe('parseChatBody', () => {
  it('trims text and passes adultVerified through', () => {
    expect(
      parseChatBody(
        JSON.stringify({
          sessionId: 's',
          characterId: 'sera',
          text: ' 안녕 ',
          adultVerified: true,
        }),
      ),
    ).toEqual({
      body: { sessionId: 's', characterId: 'sera', text: '안녕', adultVerified: true },
    });
  });
});
