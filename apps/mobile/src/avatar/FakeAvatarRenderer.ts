import { decodeFrame } from '@murmur/face-protocol';
import type { FaceFrame } from '@murmur/face-protocol';
import type { AvatarRendererAdapter, AvatarSlot } from './types';

/**
 * 렌더링 대신 마지막 프레임을 기록하는 가짜 렌더러. 스냅샷 테스트와 브리지 계약 검증용.
 * 실제 Unity 브리지는 같은 인터페이스로 apps/mobile/src/avatar/UnityAvatarRenderer.ts에 둔다.
 */
export class FakeAvatarRenderer implements AvatarRendererAdapter {
  readonly kind = 'fake' as const;
  readonly loaded = new Map<AvatarSlot, string>();
  readonly lastFrame = new Map<AvatarSlot, FaceFrame>();
  frameCount = 0;
  theme: 'light' | 'dark' = 'light';
  disposed = false;

  async loadAvatar(slot: AvatarSlot, assetKey: string): Promise<void> {
    this.loaded.set(slot, assetKey);
  }

  pushFrame(slot: AvatarSlot, encoded: Uint8Array): void {
    if (!this.loaded.has(slot)) throw new Error(`avatar not loaded for slot ${slot}`);
    this.lastFrame.set(slot, decodeFrame(encoded));
    this.frameCount++;
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.theme = theme;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.loaded.clear();
  }
}
