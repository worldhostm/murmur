import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { EmitterSubscription } from 'react-native';
import { decodeFrame } from '@murmur/face-protocol';
import type { FaceFrame, TrackingState } from '@murmur/face-protocol';
import type { FaceTrackerAdapter } from './types';
import { decodeBase64 } from './base64';

/** 네이티브 모듈 이름과 이벤트. iOS: ios/Murmur/MurmurFaceTracker.swift, Android: android/.../MurmurFaceTrackerModule.kt */
export const FACE_TRACKER_MODULE = 'MurmurFaceTracker';
export const EVENT_FACE_FRAME = 'murmur.faceFrame';
export const EVENT_TRACKING_STATE = 'murmur.trackingState';

interface NativeFaceTrackerModule {
  isSupported(): Promise<boolean>;
  start(): Promise<void>;
  stop(): Promise<void>;
  setDirectToUnity(enabled: boolean): void;
  addListener?(eventName: string): void;
  removeListeners?(count: number): void;
}

interface FaceFrameEvent {
  frame: string;
  slot: 'local';
}

interface TrackingStateEvent {
  state: TrackingState;
}

function getModule(): NativeFaceTrackerModule {
  const mod = (NativeModules as Record<string, unknown>)[FACE_TRACKER_MODULE] as NativeFaceTrackerModule | undefined;
  if (!mod) {
    throw new Error(
      `${FACE_TRACKER_MODULE} 네이티브 모듈이 없습니다. 네이티브 프로젝트를 빌드했는지, 테스트라면 FakeFaceTracker를 쓰는지 확인하세요.`,
    );
  }
  return mod;
}

/**
 * ARKit(iOS) / MediaPipe(Android) 네이티브 트래커 어댑터.
 * 네이티브는 base64로 감싼 face-protocol 144바이트 프레임만 보낸다. 픽셀 버퍼는 어떤 경로로도 오지 않는다.
 */
export class NativeFaceTracker implements FaceTrackerAdapter {
  readonly kind: 'arkit' | 'mediapipe' = Platform.OS === 'ios' ? 'arkit' : 'mediapipe';
  private readonly native: NativeFaceTrackerModule;
  private readonly emitter: NativeEventEmitter;
  private readonly listeners = new Set<(frame: FaceFrame) => void>();
  private readonly stateListeners = new Set<(state: TrackingState) => void>();
  private frameSub: EmitterSubscription | null = null;
  private stateSub: EmitterSubscription | null = null;

  constructor() {
    this.native = getModule();
    // iOS는 RCTEventEmitter 인스턴스를 넘겨야 하고, Android는 인자가 없어도 된다.
    this.emitter = new NativeEventEmitter(Platform.OS === 'ios' ? (this.native as never) : undefined);
  }

  static async isSupported(): Promise<boolean> {
    const mod = (NativeModules as Record<string, unknown>)[FACE_TRACKER_MODULE] as NativeFaceTrackerModule | undefined;
    if (!mod) return false;
    return mod.isSupported();
  }

  /** true면 프레임이 JS를 거치지 않고 네이티브에서 Unity로 바로 간다. 통화 중 기본값. */
  setDirectToUnity(enabled: boolean): void {
    this.native.setDirectToUnity(enabled);
  }

  async start(): Promise<void> {
    if (!this.frameSub) {
      this.frameSub = this.emitter.addListener(EVENT_FACE_FRAME, (e: FaceFrameEvent) => this.handleFrame(e));
      this.stateSub = this.emitter.addListener(EVENT_TRACKING_STATE, (e: TrackingStateEvent) => {
        for (const l of this.stateListeners) l(e.state);
      });
    }
    await this.native.start();
  }

  async stop(): Promise<void> {
    await this.native.stop();
    this.frameSub?.remove();
    this.stateSub?.remove();
    this.frameSub = null;
    this.stateSub = null;
  }

  onFrame(listener: (frame: FaceFrame) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onTrackingState(listener: (state: TrackingState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private handleFrame(event: FaceFrameEvent): void {
    if (this.listeners.size === 0) return;
    let frame: FaceFrame;
    try {
      frame = decodeFrame(decodeBase64(event.frame));
    } catch {
      // 깨진 프레임은 버린다. 다음 프레임이 33ms 뒤에 온다.
      return;
    }
    for (const l of this.listeners) l(frame);
  }
}
