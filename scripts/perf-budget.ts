/**
 * 성능 예산 (PLANNING.md "테스트 전략 5"). 기준을 넘으면 CI를 실패시킨다.
 *
 * 측정 항목 (모두 CPU 전용, 카메라·GPU 없음):
 *  1. face-protocol encode+decode: 1프레임 평균 시간. 30fps × 방 통화 6명이 브리지를 넘을 때 JS 쪽 예산.
 *  2. viseme → 표정 프레임 생성: 3초 발화분(30fps) 생성 시간. 말→입 모양 지연에 직접 더해지는 비용.
 *  3. ai-character 파이프라인 오버헤드: 가짜 STT/LLM/TTS로 1회 응답. 공급자 지연을 뺀 순수 코드 비용.
 *
 * 예산은 2020년 보급형 기기와 느린 CI 러너를 고려해 로컬 측정값의 10배 이상 여유를 둔다.
 * 실기기 프레임 시간과 체감 지연 측정은 0단계 PoC에서 네이티브 쪽 스크립트로 따로 둔다.
 */
import { performance } from 'node:perf_hooks';
import { decodeFrame, encodeFrame, neutralFrame } from '@murmur/face-protocol';
import {
  ConversationPipeline,
  FakeLlm,
  FakeStt,
  FakeTts,
  PERSONAS,
  visemesToFaceFrames,
} from '@murmur/ai-character';
import type { Viseme } from '@murmur/ai-character';

interface Budget {
  name: string;
  limitMs: number;
  run: () => Promise<number> | number;
}

function frameWithNoise(i: number) {
  const f = neutralFrame(i * 33.3);
  for (let k = 0; k < f.blendShapes.length; k++) f.blendShapes[k] = ((i * 31 + k * 17) % 100) / 100;
  return f;
}

const budgets: Budget[] = [
  {
    name: 'face-protocol encode+decode per frame',
    limitMs: 0.05,
    run: () => {
      const N = 50_000;
      const frames = Array.from({ length: 64 }, (_, i) => frameWithNoise(i));
      const t0 = performance.now();
      for (let i = 0; i < N; i++) decodeFrame(encodeFrame(frames[i % frames.length]!));
      return (performance.now() - t0) / N;
    },
  },
  {
    name: 'viseme → face frames (3s utterance @30fps)',
    limitMs: 20,
    run: () => {
      const shapes: Viseme['shape'][] = ['aa', 'E', 'ih', 'oh', 'ou', 'PP', 'FF', 'TH', 'DD', 'kk', 'CH', 'SS', 'nn', 'RR', 'sil'];
      const visemes: Viseme[] = Array.from({ length: 50 }, (_, i) => ({ timeMs: i * 60, shape: shapes[i % shapes.length]!, weight: 1 }));
      const t0 = performance.now();
      for (let r = 0; r < 10; r++) visemesToFaceFrames(visemes, { fps: 30, startTimestampMs: 0 });
      return (performance.now() - t0) / 10;
    },
  },
  {
    name: 'ai-character pipeline overhead (fake providers)',
    limitMs: 50,
    run: async () => {
      const persona = PERSONAS['seo-doyoon'];
      const pipeline = new ConversationPipeline(
        { stt: new FakeStt([]), llm: new FakeLlm({ script: ['오늘도 수고했어. 천천히 말해 줘.'] }), tts: new FakeTts() },
        persona,
        { mode: 'solo', adultVerified: true },
      );
      const signals = { smile: 0.2, frown: 0, gazeAway: 0.1, fatigue: 0.3 };
      await pipeline.respond('그냥 좀 피곤한 하루였어', signals); // warm-up
      const t0 = performance.now();
      for (let i = 0; i < 5; i++) await pipeline.respond('오늘은 면접이 있었어', signals);
      return (performance.now() - t0) / 5;
    },
  },
];

async function main(): Promise<void> {
  let failed = false;
  for (const b of budgets) {
    const ms = await b.run();
    const ok = ms <= b.limitMs;
    failed ||= !ok;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${b.name}: ${ms.toFixed(4)} ms (budget ${b.limitMs} ms)`);
  }
  if (failed) {
    console.error('성능 예산 초과.');
    process.exit(1);
  }
}

main();
