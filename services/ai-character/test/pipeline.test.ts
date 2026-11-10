import { describe, expect, it } from 'vitest';
import { FakeLlm, FakeStt, FakeTts } from '../src/adapters/fake';
import { ConversationPipeline } from '../src/pipeline';
import { PERSONAS } from '../src/persona';
import { NEUTRAL_SIGNALS } from '../src/signals';

function make(script?: string[]) {
  const llm = new FakeLlm(script ? { script } : {});
  const tts = new FakeTts();
  const stt = new FakeStt(['오늘', '면접 봤어']);
  const pipeline = new ConversationPipeline({ stt, llm, tts }, PERSONAS['sera'], {
    mode: 'solo',
    adultVerified: true,
    historyLimit: 6,
  });
  return { pipeline, llm, tts, stt };
}

async function* noAudio(): AsyncIterable<Uint8Array> {}

describe('ConversationPipeline', () => {
  it('end-to-end with fakes: text, frames, history', async () => {
    const { pipeline, llm, tts } = make(['됐고. 뭐가 막혔는데.']);
    const text = await pipeline.transcribe(noAudio());
    expect(text).toBe('면접 봤어');
    const res = await pipeline.respond(text, NEUTRAL_SIGNALS);
    expect(res.crisis).toBe(false);
    expect(res.text).toBe('됐고. 뭐가 막혔는데.');
    expect(res.expression).toBe('neutral');
    expect(res.frames.length).toBeGreaterThan(0);
    expect(llm.calls).toHaveLength(1);
    expect(llm.calls[0]!.system).toContain('세라');
    expect(tts.calls[0]!.voiceId).toBe('sera-v1');
    expect(pipeline.getHistory().map((m) => m.role)).toEqual(['user', 'assistant']);
    expect(pipeline.summarize()).toEqual({
      lastUser: '면접 봤어',
      lastAssistant: '됐고. 뭐가 막혔는데.',
    });
  });

  it('crisis path bypasses the LLM and mentions 109', async () => {
    const { pipeline, llm } = make();
    const res = await pipeline.respond('죽고 싶어', NEUTRAL_SIGNALS);
    expect(res.crisis).toBe(true);
    expect(res.text).toContain('109');
    expect(res.expression).toBe('worried');
    expect(llm.calls).toHaveLength(0);
    expect(res.frames.length).toBeGreaterThan(0);
  });

  it('derives the character expression from the reply text', async () => {
    const { pipeline } = make(['ㅋㅋㅋ 그거 완전 최고네.']);
    const res = await pipeline.respond('오늘 승진했어', NEUTRAL_SIGNALS);
    expect(res.expression).toBe('bigSmile');
  });

  it('history is bounded and frame timestamps advance across turns', async () => {
    const { pipeline } = make();
    const first = await pipeline.respond('하나', NEUTRAL_SIGNALS);
    const second = await pipeline.respond('둘', NEUTRAL_SIGNALS);
    expect(second.frames[0]!.timestampMs).toBeGreaterThan(
      first.frames[first.frames.length - 1]!.timestampMs,
    );
    for (let i = 0; i < 5; i++) await pipeline.respond(`msg ${i}`, NEUTRAL_SIGNALS);
    expect(pipeline.getHistory().length).toBeLessThanOrEqual(6);
  });
});
