import type { TextToSpeechAdapter, TtsChunk, Viseme, VisemeShape } from '../types';

/** 글자당 길이(ms). 결정적 테스트를 위한 고정값. */
export const FAKE_TTS_MS_PER_CHAR = 60;
const CYCLE: readonly VisemeShape[] = ['aa', 'E', 'sil'];

/** 테스트용 TTS. 글자마다 60ms 짜리 viseme 를 aa/E/sil 순서로 낸다. 오디오는 비어 있다. */
export class FakeTts implements TextToSpeechAdapter {
  readonly calls: { text: string; voiceId: string }[] = [];

  async *synthesize(text: string, voiceId: string): AsyncIterable<TtsChunk> {
    this.calls.push({ text, voiceId });
    const visemes: Viseme[] = [];
    for (let i = 0; i < text.length; i++) {
      visemes.push({
        timeMs: i * FAKE_TTS_MS_PER_CHAR,
        shape: CYCLE[i % CYCLE.length]!,
        weight: 1,
      });
    }
    yield { audio: new Uint8Array(0), visemes };
  }
}
