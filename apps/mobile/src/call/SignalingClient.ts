import type { ClientMessage, ServerEvent } from '@murmur/shared-types';

export interface SignalingConnection {
  send(message: ClientMessage): Promise<void>;
  close(): void;
}
export type ConnectSignaling = (
  onEvent: (event: ServerEvent) => void,
  onError: () => void,
) => Promise<SignalingConnection>;

export function signalingConnector(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
): ConnectSignaling {
  return async (onEvent, onError) => {
    const request = async (path: string, body: unknown, token?: string) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}/${path}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Signaling request failed');
        return await res.json();
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    };
    const { token } = (await request('connect', null)) as { token: string };
    if (typeof token !== 'string') throw new Error('Invalid connection');
    let alive = true;
    let cursor = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const close = () => {
      if (!alive) return;
      alive = false;
      if (timer !== undefined) clearTimeout(timer);
      void request('close', null, token).catch(() => undefined);
    };
    const poll = async () => {
      try {
        const data = (await request('poll', cursor, token)) as {
          events: { id: number; event: ServerEvent }[];
          cursor: number;
        };
        if (!alive) return;
        if (!Array.isArray(data.events) || !Number.isSafeInteger(data.cursor))
          throw new Error('Invalid events');
        for (const item of data.events) if (item.id > cursor) onEvent(item.event);
        cursor = data.cursor;
        timer = setTimeout(() => {
          void poll();
        }, 1000);
      } catch {
        if (alive) {
          close();
          onError();
        }
      }
    };
    timer = setTimeout(() => {
      void poll();
    }, 0);
    return {
      send: async (message) => {
        if (!alive) throw new Error('Closed');
        await request('send', message, token);
      },
      close,
    };
  };
}
