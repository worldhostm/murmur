import { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import { encodeFrame } from '@murmur/face-protocol';
import type { TrackingState } from '@murmur/face-protocol';
import type { AvatarRendererAdapter, AvatarSlot, FaceTrackerAdapter } from './types';
import { createAvatarRenderer, createFaceTracker } from './createAdapters';

export type FaceTrackingStatus =
  'idle' | 'starting' | 'tracking' | 'limited' | 'lost' | 'permission-denied' | 'error';

export interface UseFaceTrackingOptions {
  enabled: boolean;
  /** 내 프레임을 remote 슬롯에도 보낸다 (PoC: 내 표정을 큰 아바타로 본다). */
  mirrorToRemote?: boolean;
  /** 슬롯에 로드할 아바타 에셋 키. 기본 builtin/primitive (VRM 전 테스트 아바타). */
  assetKey?: string;
  /** OS "동작 줄이기". 렌더러의 아이들 모션·배경 빛을 멈춘다. */
  reduceMotion?: boolean;
  /** 테스트·스토리북용 주입. */
  createTracker?: () => FaceTrackerAdapter;
  createRenderer?: () => AvatarRendererAdapter;
}

export interface FaceTrackingResult {
  status: FaceTrackingStatus;
  /** 최근 1초 동안 JS 가 받은 프레임 수. 30 근처가 목표. */
  fps: number;
  frames: number;
  error?: string | undefined;
}

const STATUS_BY_TRACKING: Record<TrackingState, FaceTrackingStatus> = {
  tracked: 'tracking',
  limited: 'limited',
  lost: 'lost',
};

async function ensureCameraPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true; // iOS 는 네이티브 모듈이 요청하고 E_CAMERA_DENIED 로 거부를 알린다
  const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
  if (!permission) return false;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * 통화 화면의 트래킹 파이프라인: 카메라 권한 → 트래커 시작 → 프레임을 face-protocol 로 인코딩해 렌더러 슬롯에 push.
 * 원본 영상은 어디에도 닿지 않는다. 화면을 떠나면 트래커를 멈추고 렌더러를 정리한다.
 */
export function useFaceTracking(opts: UseFaceTrackingOptions): FaceTrackingResult {
  const {
    enabled,
    mirrorToRemote = false,
    assetKey = 'builtin/primitive',
    reduceMotion = false,
  } = opts;
  const rendererRef = useRef<AvatarRendererAdapter | null>(null);
  const [rendererReady, setRendererReady] = useState(false);
  const [status, setStatus] = useState<FaceTrackingStatus>('idle');
  const [fps, setFps] = useState(0);
  const [frames, setFrames] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);
  const createTrackerRef = useRef(opts.createTracker);
  const createRendererRef = useRef(opts.createRenderer);
  createTrackerRef.current = opts.createTracker;
  createRendererRef.current = opts.createRenderer;

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }
    let alive = true;
    let unsubscribe: (() => void) | null = null;
    let tracker: FaceTrackerAdapter | null = null;
    let renderer: AvatarRendererAdapter | null = null;
    let windowCount = 0;
    let total = 0;
    const slots: AvatarSlot[] = mirrorToRemote ? ['local', 'remote'] : ['local'];

    const ticker = setInterval(() => {
      if (!alive) return;
      setFps(windowCount);
      setFrames(total);
      windowCount = 0;
    }, 1000);

    (async () => {
      setStatus('starting');
      setError(undefined);
      try {
        if (!(await ensureCameraPermission())) {
          if (alive) setStatus('permission-denied');
          return;
        }
        tracker = (createTrackerRef.current ?? createFaceTracker)();
        renderer = (createRendererRef.current ?? createAvatarRenderer)();
        rendererRef.current = renderer;
        for (const slot of slots) await renderer.loadAvatar(slot, assetKey);
        if (alive) setRendererReady(true);
        unsubscribe = tracker.onFrame((frame) => {
          if (!alive || !renderer) return;
          const encoded = encodeFrame(frame);
          for (const slot of slots) renderer.pushFrame(slot, encoded);
          windowCount++;
          total++;
          setStatus(STATUS_BY_TRACKING[frame.tracking]);
        });
        await tracker.start();
      } catch (e) {
        if (!alive) return;
        const code = (e as { code?: string }).code;
        setStatus(code === 'E_CAMERA_DENIED' ? 'permission-denied' : 'error');
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      alive = false;
      setRendererReady(false);
      rendererRef.current = null;
      clearInterval(ticker);
      unsubscribe?.();
      void tracker?.stop();
      void renderer?.dispose();
    };
  }, [enabled, mirrorToRemote, assetKey]);

  useEffect(() => {
    if (!rendererReady) return;
    rendererRef.current?.setMotion(reduceMotion);
  }, [rendererReady, reduceMotion]);

  return { status, fps, frames, error };
}
