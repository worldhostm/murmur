import { NativeModules } from 'react-native';
import type { AvatarRendererAdapter, FaceTrackerAdapter } from './types';
import { FakeFaceTracker } from './FakeFaceTracker';
import type { FakeFaceTrackerOptions } from './FakeFaceTracker';
import { FakeAvatarRenderer } from './FakeAvatarRenderer';
import { NativeFaceTracker, FACE_TRACKER_MODULE } from './NativeFaceTracker';
import { UnityAvatarRenderer, UNITY_MODULE } from './UnityAvatarRenderer';

declare const __DEV__: boolean | undefined;

function hasNative(name: string): boolean {
  return Boolean((NativeModules as Record<string, unknown>)[name]);
}

function isDev(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

export interface CreateFaceTrackerOptions {
  /** true면 항상 가짜(픽스처 재생). 개발 빌드에서 네이티브 모듈이 없을 때도 가짜로 떨어진다. */
  fake?: boolean;
  fakeOptions?: FakeFaceTrackerOptions;
}

export function createFaceTracker(opts: CreateFaceTrackerOptions = {}): FaceTrackerAdapter {
  if (opts.fake || (isDev() && !hasNative(FACE_TRACKER_MODULE))) {
    return new FakeFaceTracker(opts.fakeOptions);
  }
  return new NativeFaceTracker();
}

export interface CreateAvatarRendererOptions {
  fake?: boolean;
}

export function createAvatarRenderer(opts: CreateAvatarRendererOptions = {}): AvatarRendererAdapter {
  if (opts.fake || (isDev() && !hasNative(UNITY_MODULE))) {
    return new FakeAvatarRenderer();
  }
  return new UnityAvatarRenderer();
}
