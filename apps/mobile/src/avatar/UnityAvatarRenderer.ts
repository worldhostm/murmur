import { NativeModules } from 'react-native';
import type { AvatarRendererAdapter, AvatarSlot } from './types';
import { encodeBase64 } from './base64';

/** 네이티브 모듈 이름. iOS: ios/Murmur/MurmurUnityBridge.swift, Android: android/.../MurmurUnityModule.kt */
export const UNITY_MODULE = 'MurmurUnity';

interface NativeUnityModule {
  loadAvatar(slot: string, assetKey: string): Promise<void>;
  pushFrame(slot: string, base64: string): void;
  setTheme(theme: string): void;
  dispose(): Promise<void>;
}

function getModule(): NativeUnityModule {
  const mod = (NativeModules as Record<string, unknown>)[UNITY_MODULE] as NativeUnityModule | undefined;
  if (!mod) {
    throw new Error(
      `${UNITY_MODULE} 네이티브 모듈이 없습니다. Unity 임베드 전이거나 테스트라면 FakeAvatarRenderer를 쓰세요.`,
    );
  }
  return mod;
}

/**
 * RN↔Unity 브리지 어댑터 (ADR 0001). 프레임은 face-protocol 바이너리를 base64로 감싸 넘긴다.
 * Unity 쪽 수신: apps/avatar-unity/Assets/Murmur/Scripts/MurmurBridge.cs (GameObject "MurmurBridge").
 */
export class UnityAvatarRenderer implements AvatarRendererAdapter {
  readonly kind = 'unity' as const;
  private readonly native: NativeUnityModule;
  private readonly loaded = new Set<AvatarSlot>();

  constructor() {
    this.native = getModule();
  }

  async loadAvatar(slot: AvatarSlot, assetKey: string): Promise<void> {
    await this.native.loadAvatar(slot, assetKey);
    this.loaded.add(slot);
  }

  pushFrame(slot: AvatarSlot, encoded: Uint8Array): void {
    if (!this.loaded.has(slot)) throw new Error(`avatar not loaded for slot ${slot}`);
    this.native.pushFrame(slot, encodeBase64(encoded));
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.native.setTheme(theme);
  }

  async dispose(): Promise<void> {
    await this.native.dispose();
    this.loaded.clear();
  }
}
