import { decodeFrame, encodeFrame, frameFromJson, neutralFrame } from '@murmur/face-protocol';
import type { FaceFrame } from '@murmur/face-protocol';
import type { FaceTrackerAdapter } from './types';

export interface FakeFaceTrackerOptions {
  /** 재생할 프레임. JSON 픽스처(frameFromJson)나 FaceFrame. 비어 있으면 neutral 1개. */
  frames?: readonly unknown[];
  fps?: number;
  loop?: boolean;
  /** 테스트에서 타이머 대신 수동으로 tick 하려면 true. */
  manual?: boolean;
}

function isFaceFrame(f: unknown): f is FaceFrame {
  return typeof f === 'object' && f !== null && (f as FaceFrame).blendShapes instanceof Float32Array;
}

/**
 * 녹화된 표정 수치(fixture)를 재생하는 가짜 트래커 (PLANNING.md "테스트 전략: 카메라 없이 CI에서").
 * 프레임마다 encode→decode를 거쳐 실제 브리지와 같은 양자화 손실을 재현한다.
 */
export class FakeFaceTracker implements FaceTrackerAdapter {
  readonly kind = 'fake' as const;
  private readonly frames: FaceFrame[];
  private readonly fps: number;
  private readonly loop: boolean;
  private readonly manual: boolean;
  private listeners = new Set<(frame: FaceFrame) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private cursor = 0;
  private startedAt = 0;

  constructor(opts: FakeFaceTrackerOptions = {}) {
    const raw = opts.frames && opts.frames.length > 0 ? opts.frames : [neutralFrame(0)];
    this.frames = raw.map((f) => (isFaceFrame(f) ? f : frameFromJson(f)));
    this.fps = opts.fps ?? 30;
    this.loop = opts.loop ?? true;
    this.manual = opts.manual ?? false;
  }

  async start(): Promise<void> {
    this.startedAt = Date.now();
    this.cursor = 0;
    if (!this.manual && !this.timer) {
      this.timer = setInterval(() => this.tick(), 1000 / this.fps);
    }
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  onFrame(listener: (frame: FaceFrame) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 다음 프레임을 한 번 내보낸다. 끝에 도달하고 loop=false면 false. */
  tick(): boolean {
    if (this.cursor >= this.frames.length) {
      if (!this.loop) return false;
      this.cursor = 0;
    }
    const src = this.frames[this.cursor++]!;
    const stamped: FaceFrame = { ...src, timestampMs: Date.now() - this.startedAt };
    const frame = decodeFrame(encodeFrame(stamped));
    for (const l of this.listeners) l(frame);
    return true;
  }
}
