import { signalingConnector } from './SignalingClient';

it('uses a bearer connection, forwards messages, polls events, and stops on close', async () => {
  jest.useFakeTimers();
  const fetchMock = jest.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith('/connect')) return { ok: true, json: async () => ({ token: 'secret' }) };
    expect(init.headers).toMatchObject({ authorization: 'Bearer secret' });
    if (url.endsWith('/poll'))
      return {
        ok: true,
        json: async () => ({
          cursor: 1,
          events: [{ id: 1, event: { type: 'room-created', sessionId: 's', code: 'ABC234' } }],
        }),
      };
    return { ok: true, json: async () => ({}) };
  });
  try {
    const listener = jest.fn();
    const error = jest.fn();
    const connection = await signalingConnector(
      'http://localhost/',
      fetchMock as unknown as typeof fetch,
    )(listener, error);
    await connection.send({ type: 'create-room' });
    await jest.advanceTimersByTimeAsync(0);
    expect(listener).toHaveBeenCalledWith({ type: 'room-created', sessionId: 's', code: 'ABC234' });
    await jest.advanceTimersByTimeAsync(1000);
    expect(listener).toHaveBeenCalledTimes(1);
    connection.close();
    await jest.advanceTimersByTimeAsync(10_000);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith('/poll'))).toHaveLength(2);
    expect(error).not.toHaveBeenCalled();
    await expect(connection.send({ type: 'leave' })).rejects.toThrow('Closed');
  } finally {
    jest.useRealTimers();
  }
});
