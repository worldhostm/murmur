import { useEffect, useRef, useState } from 'react';
import { encodeFrame } from '@murmur/face-protocol';
import { frameForExpression } from '@murmur/expression-cues';
import type { SpriteExpression } from '@murmur/expression-cues';
import type { AvatarRendererAdapter, AvatarSlot } from './types';
import { createAvatarRenderer } from './createAdapters';

export interface UseAvatarExpressionOptions {
  enabled: boolean;
  /** 슬롯에 로드할 아바타 에셋 키 (characters/<id>/front). */
  assetKey: string;
  /** 지금 보여줄 표정. 바뀔 때마다 프레임을 보낸다. */
  expression: SpriteExpression;
  /** 프레임을 보낼 슬롯. 통화 씬에서 크게 보이는 슬롯은 remote (local 은 비활성). */
  slot?: AvatarSlot;
  /** 같은 표정이라도 이 주기로 다시 보낸다 (Unity 가 수신 끊김으로 굳히지 않게). 기본 1000ms. */
  heartbeatMs?: number;
  /** OS "동작 줄이기". 렌더러의 아이들 모션·배경 빛을 멈춘다. */
  reduceMotion?: boolean;
  /** 테스트용 주입. */
  createRenderer?: () => AvatarRendererAdapter;
}

export interface AvatarExpressionResult {
  /** 아바타가 로드되어 프레임을 보내는 중인지. */
  ready: boolean;
  /** 보낸 프레임 수. */
  pushes: number;
  error?: string | undefined;
}

/**
 * 카메라 없이 표정만 구동하는 파이프라인 (솔로 채팅). 표정 → face-protocol 프레임 → 렌더러 슬롯.
 * 트래커를 쓰지 않으므로 카메라 권한이 필요 없다. 화면을 떠나면 렌더러를 정리한다.
 */
export function useAvatarExpression(opts: UseAvatarExpressionOptions): AvatarExpressionResult {
  const {
    enabled,
    assetKey,
    expression,
    slot = 'remote',
    heartbeatMs = 1000,
    reduceMotion = false,
  } = opts;
  const [ready, setReady] = useState(false);
  const [pushes, setPushes] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);
  const rendererRef = useRef<AvatarRendererAdapter | null>(null);
  const startedAtRef = useRef(Date.now());
  const createRendererRef = useRef(opts.createRenderer);
  createRendererRef.current = opts.createRenderer;

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    let alive = true;
    const renderer = (createRendererRef.current ?? createAvatarRenderer)();
    rendererRef.current = renderer;
    startedAtRef.current = Date.now();
    setError(undefined);
    renderer
      .loadAvatar(slot, assetKey)
      .then(() => alive && setReady(true))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
      setReady(false);
      rendererRef.current = null;
      void renderer.dispose();
    };
  }, [enabled, assetKey, slot]);

  useEffect(() => {
    if (!ready) return;
    rendererRef.current?.setMotion(reduceMotion);
  }, [ready, reduceMotion]);

  useEffect(() => {
    if (!ready) return;
    const push = (): void => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      renderer.pushFrame(
        slot,
        encodeFrame(frameForExpression(expression, Date.now() - startedAtRef.current)),
      );
      setPushes((n) => n + 1);
    };
    push();
    const timer = setInterval(push, heartbeatMs);
    return () => clearInterval(timer);
  }, [ready, expression, slot, heartbeatMs]);

  return { ready, pushes, error };
}
