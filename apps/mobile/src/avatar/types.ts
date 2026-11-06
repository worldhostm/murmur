import type { FaceFrame } from '@murmur/face-protocol';

/**
 * 트래킹 어댑터 (CLAUDE.md "외부 의존성 격리").
 * iOS는 ARKit(Face ID 기기만), Android는 MediaPipe Face Landmarker가 네이티브 모듈로 구현한다.
 * 어댑터는 face-protocol 프레임만 내보낸다. 원본 카메라 영상은 어떤 경로로도 JS에 오지 않는다.
 */
export interface FaceTrackerAdapter {
  readonly kind: 'arkit' | 'mediapipe' | 'fake';
  start(): Promise<void>;
  stop(): Promise<void>;
  /** 초당 30회 안팎. 구독 해제 함수를 돌려준다. */
  onFrame(listener: (frame: FaceFrame) => void): () => void;
}

/** 아바타 하나를 그리는 렌더러 슬롯. 'local'은 내 캐릭터, 'remote'는 상대. */
export type AvatarSlot = 'local' | 'remote';

/**
 * 렌더러 어댑터. RN↔Unity 브리지가 구현한다 (ADR 0001).
 * 프레임은 바이너리(encodeFrame)로 넘겨 브리지 비용을 줄인다.
 */
export interface AvatarRendererAdapter {
  readonly kind: 'unity' | 'fake';
  loadAvatar(slot: AvatarSlot, assetKey: string): Promise<void>;
  pushFrame(slot: AvatarSlot, encoded: Uint8Array): void;
  setTheme(theme: 'light' | 'dark'): void;
  dispose(): Promise<void>;
}
