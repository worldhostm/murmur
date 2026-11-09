import { ScriptedReplyAdapter } from './ScriptedReplyAdapter';
import type { ReplyGroup } from './ScriptedReplyAdapter';

function make() {
  const lines = jest.fn((id: string, group: ReplyGroup) => [
    `${id}:${group}:1`,
    `${id}:${group}:2`,
  ]);
  const adapter = new ScriptedReplyAdapter({
    lines,
    crisisText: () => '109 안내',
    delayMs: [0, 0],
  });
  return { adapter, lines };
}

describe('ScriptedReplyAdapter', () => {
  it('answers a hard day from the down group with a worried face', async () => {
    const { adapter } = make();
    const reply = await adapter.reply({
      characterId: 'sera',
      history: [],
      text: '오늘 너무 힘들었어',
    });
    expect(reply).toEqual({ text: 'sera:down:1', expression: 'worried' });
  });

  it('answers laughter from the up group and matches the big smile', async () => {
    const { adapter } = make();
    const reply = await adapter.reply({
      characterId: 'leon-hart',
      history: [],
      text: 'ㅋㅋㅋ 완전 좋아',
    });
    expect(reply).toEqual({ text: 'leon-hart:up:1', expression: 'bigSmile' });
    const second = await adapter.reply({ characterId: 'leon-hart', history: [], text: '고마워' });
    expect(second).toEqual({ text: 'leon-hart:up:2', expression: 'smile' });
  });

  it('rotates lines within a group instead of repeating the first one', async () => {
    const { adapter } = make();
    const texts: string[] = [];
    for (let i = 0; i < 3; i++)
      texts.push(
        (await adapter.reply({ characterId: 'sera', history: [], text: '오늘 뭐 먹지' })).text,
      );
    expect(texts).toEqual(['sera:neutral:1', 'sera:neutral:2', 'sera:neutral:1']);
  });

  it('stops the character act on crisis keywords and never reads a scripted line', async () => {
    const { adapter, lines } = make();
    const reply = await adapter.reply({
      characterId: 'seo-doyoon',
      history: [],
      text: '그냥 죽고 싶어',
    });
    expect(reply).toEqual({ text: '109 안내', expression: 'worried', crisis: true });
    expect(lines).not.toHaveBeenCalled();
  });
});
