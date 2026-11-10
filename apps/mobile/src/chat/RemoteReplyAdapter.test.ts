import { RemoteReplyAdapter } from './RemoteReplyAdapter';

function fetchReturning(status: number, body: unknown) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init! });
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  }) as typeof fetch;
  return { impl, calls };
}

describe('RemoteReplyAdapter', () => {
  it('posts the turn to /chat with a stable session id and maps the response', async () => {
    const { impl, calls } = fetchReturning(200, {
      text: '됐고. 뭐가 막혔는데.',
      expression: 'serious',
      crisis: false,
    });
    const adapter = new RemoteReplyAdapter({ baseUrl: 'http://10.0.2.2:8787/', fetch: impl });
    const reply = await adapter.reply({ characterId: 'sera', history: [], text: '오늘 막혔어' });
    expect(reply).toEqual({ text: '됐고. 뭐가 막혔는데.', expression: 'serious' });
    expect(calls[0]!.url).toBe('http://10.0.2.2:8787/chat');
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body).toEqual({
      sessionId: adapter.sessionId,
      characterId: 'sera',
      text: '오늘 막혔어',
      adultVerified: false,
    });
    await adapter.reply({ characterId: 'sera', history: [], text: '둘' });
    expect(JSON.parse(calls[1]!.init.body as string).sessionId).toBe(adapter.sessionId);
  });

  it('passes the crisis flag and ignores an unknown expression', async () => {
    const { impl } = fetchReturning(200, { text: '109', expression: 'nope', crisis: true });
    const reply = await new RemoteReplyAdapter({ baseUrl: 'http://x', fetch: impl }).reply({
      characterId: 'sera',
      history: [],
      text: 'x',
    });
    expect(reply).toEqual({ text: '109', crisis: true });
  });

  it('throws RemoteReplyError on a non-2xx response or a missing text', async () => {
    await expect(
      new RemoteReplyAdapter({
        baseUrl: 'http://x',
        fetch: fetchReturning(502, { error: 'LLM' }).impl,
      }).reply({ characterId: 'sera', history: [], text: 'x' }),
    ).rejects.toMatchObject({ name: 'RemoteReplyError', status: 502 });
    await expect(
      new RemoteReplyAdapter({ baseUrl: 'http://x', fetch: fetchReturning(200, {}).impl }).reply({
        characterId: 'sera',
        history: [],
        text: 'x',
      }),
    ).rejects.toMatchObject({ name: 'RemoteReplyError' });
  });

  it('reports a connection failure as RemoteReplyError', async () => {
    const impl = (async () => {
      throw new Error('Network request failed');
    }) as typeof fetch;
    await expect(
      new RemoteReplyAdapter({ baseUrl: 'http://x', fetch: impl }).reply({
        characterId: 'sera',
        history: [],
        text: 'x',
      }),
    ).rejects.toMatchObject({
      name: 'RemoteReplyError',
      status: 0,
    });
  });
});
