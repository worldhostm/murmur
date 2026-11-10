import { FallbackReplyAdapter } from './FallbackReplyAdapter';
import type { ChatReplyAdapter } from './types';

const ok = (text: string): ChatReplyAdapter => ({
  kind: 'scripted',
  reply: async () => ({ text }),
});
const failing: ChatReplyAdapter = {
  kind: 'remote',
  reply: async () => {
    throw new Error('connection refused');
  },
};
const req = { characterId: 'sera' as const, history: [], text: '안녕' };

describe('FallbackReplyAdapter', () => {
  it('uses the primary when it succeeds and never touches the fallback', async () => {
    const warn = jest.fn();
    const fallback = {
      kind: 'scripted' as const,
      reply: jest.fn(async () => ({ text: 'fallback' })),
    };
    const adapter = new FallbackReplyAdapter(ok('primary'), fallback, warn);
    expect(await adapter.reply(req)).toEqual({ text: 'primary' });
    expect(fallback.reply).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(adapter.lastSource).toBe('primary');
  });

  it('warns and falls back when the primary fails', async () => {
    const warn = jest.fn();
    const adapter = new FallbackReplyAdapter(failing, ok('scripted line'), warn);
    expect(await adapter.reply(req)).toEqual({ text: 'scripted line' });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('connection refused'));
    expect(adapter.kind).toBe('remote');
    expect(adapter.lastSource).toBe('fallback');
  });
});
