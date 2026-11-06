import type { SpeechToTextAdapter, SttChunk } from '../types';

/** 테스트용 STT. 오디오는 무시하고 미리 준 전사를 낸다. */
export class FakeStt implements SpeechToTextAdapter {
  constructor(private readonly transcript: string[]) {}

  async *transcribe(_audio: AsyncIterable<Uint8Array>): AsyncIterable<SttChunk> {
    for (let i = 0; i < this.transcript.length; i++) {
      yield { text: this.transcript[i]!, isFinal: i === this.transcript.length - 1 };
    }
  }
}
