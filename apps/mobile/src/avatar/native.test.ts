import { blendShapeIndex, encodeFrame, frameFromJson, FRAME_BYTE_LENGTH } from '@murmur/face-protocol';
import type { FaceFrame } from '@murmur/face-protocol';
import smile from '@murmur/face-protocol/fixtures/smile.json';

// 테스트 러너(Node)의 Buffer를 기준값으로 쓴다. RN 타입에는 없어서 선언만 한다.
declare const Buffer: { from(b: Uint8Array): { toString(enc: string): string } };

type Listener = (payload: unknown) => void;
const mockListeners = new Map<string, Set<Listener>>();
function emitNative(event: string, payload: unknown): void {
  for (const l of mockListeners.get(event) ?? []) l(payload);
}

const faceTrackerNative = {
  isSupported: jest.fn(async () => true),
  start: jest.fn(async () => undefined),
  stop: jest.fn(async () => undefined),
  setDirectToUnity: jest.fn(),
  addListener: jest.fn(),
  removeListeners: jest.fn(),
};
const unityNative = {
  loadAvatar: jest.fn(async () => undefined),
  pushFrame: jest.fn(),
  setTheme: jest.fn(),
  dispose: jest.fn(async () => undefined),
};
const mockNativeModules: Record<string, unknown> = {};

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  class MockEmitter {
    addListener(event: string, listener: Listener) {
      if (!mockListeners.has(event)) mockListeners.set(event, new Set());
      mockListeners.get(event)!.add(listener);
      return { remove: () => mockListeners.get(event)!.delete(listener) };
    }
  }
  // react-native index의 getter는 전부 lazy라 spread하면 TurboModule을 건드린다. Proxy로 두 항목만 덮는다.
  // mock 변수는 import 호이스팅 뒤에 초기화되므로 접근 시점에 읽는다.
  return new Proxy(actual, {
    get: (target, key) => {
      if (key === 'NativeModules') return mockNativeModules;
      if (key === 'NativeEventEmitter') return MockEmitter;
      return target[key];
    },
  });
});

// jest.mock은 호이스팅되므로 import는 mock 이후에 평가된다.
import {
  EVENT_FACE_FRAME,
  EVENT_TRACKING_STATE,
  FACE_TRACKER_MODULE,
  NativeFaceTracker,
  UNITY_MODULE,
  UnityAvatarRenderer,
  createAvatarRenderer,
  createFaceTracker,
  encodeBase64,
} from './index';

const smileFrame = frameFromJson(smile as never);
const smileBytes = encodeFrame(smileFrame);

beforeEach(() => {
  mockListeners.clear();
  jest.clearAllMocks();
  mockNativeModules[FACE_TRACKER_MODULE] = faceTrackerNative;
  mockNativeModules[UNITY_MODULE] = unityNative;
});

describe('NativeFaceTracker', () => {
  it('throws a clear error when the native module is missing', () => {
    delete mockNativeModules[FACE_TRACKER_MODULE];
    expect(() => new NativeFaceTracker()).toThrow(/MurmurFaceTracker/);
  });

  it('start/stop call native and decode base64 events into frames', async () => {
    const tracker = new NativeFaceTracker();
    expect(tracker.kind).toBe('arkit'); // jest react-native preset은 ios
    const got: FaceFrame[] = [];
    tracker.onFrame((f) => got.push(f));
    await tracker.start();
    expect(faceTrackerNative.start).toHaveBeenCalledTimes(1);

    emitNative(EVENT_FACE_FRAME, { frame: encodeBase64(smileBytes), slot: 'local' });
    expect(got).toHaveLength(1);
    expect(got[0]!.blendShapes[blendShapeIndex('mouthSmileLeft')]).toBeCloseTo(0.8, 3);
    expect(got[0]!.tracking).toBe('tracked');

    // 깨진 프레임은 조용히 버린다.
    emitNative(EVENT_FACE_FRAME, { frame: 'AAAA', slot: 'local' });
    expect(got).toHaveLength(1);

    await tracker.stop();
    expect(faceTrackerNative.stop).toHaveBeenCalledTimes(1);
    emitNative(EVENT_FACE_FRAME, { frame: encodeBase64(smileBytes), slot: 'local' });
    expect(got).toHaveLength(1);
  });

  it('forwards tracking state events and direct-to-unity flag', async () => {
    const tracker = new NativeFaceTracker();
    const states: string[] = [];
    tracker.onTrackingState((s) => states.push(s));
    await tracker.start();
    emitNative(EVENT_TRACKING_STATE, { state: 'lost' });
    expect(states).toEqual(['lost']);
    tracker.setDirectToUnity(true);
    expect(faceTrackerNative.setDirectToUnity).toHaveBeenCalledWith(true);
  });

  it('isSupported resolves false without the module', async () => {
    await expect(NativeFaceTracker.isSupported()).resolves.toBe(true);
    delete mockNativeModules[FACE_TRACKER_MODULE];
    await expect(NativeFaceTracker.isSupported()).resolves.toBe(false);
  });
});

describe('UnityAvatarRenderer', () => {
  it('passes base64 of the exact frame bytes, only for loaded slots', async () => {
    const renderer = new UnityAvatarRenderer();
    expect(renderer.kind).toBe('unity');
    expect(() => renderer.pushFrame('remote', smileBytes)).toThrow();
    await renderer.loadAvatar('remote', 'characters/sera/front');
    expect(unityNative.loadAvatar).toHaveBeenCalledWith('remote', 'characters/sera/front');
    renderer.pushFrame('remote', smileBytes);
    const [slot, b64] = unityNative.pushFrame.mock.calls[0] as [string, string];
    expect(slot).toBe('remote');
    expect(b64).toBe(Buffer.from(smileBytes).toString('base64'));
    expect(smileBytes).toHaveLength(FRAME_BYTE_LENGTH);
    renderer.setTheme('dark');
    expect(unityNative.setTheme).toHaveBeenCalledWith('dark');
    await renderer.dispose();
    expect(unityNative.dispose).toHaveBeenCalled();
  });

  it('throws when the native module is missing', () => {
    delete mockNativeModules[UNITY_MODULE];
    expect(() => new UnityAvatarRenderer()).toThrow(/MurmurUnity/);
  });
});

describe('createAdapters', () => {
  it('returns native adapters when modules exist, fakes when asked', () => {
    expect(createFaceTracker().kind).toBe('arkit');
    expect(createAvatarRenderer().kind).toBe('unity');
    expect(createFaceTracker({ fake: true }).kind).toBe('fake');
    expect(createAvatarRenderer({ fake: true }).kind).toBe('fake');
  });

  it('falls back to fakes in __DEV__ when native modules are missing', () => {
    delete mockNativeModules[FACE_TRACKER_MODULE];
    delete mockNativeModules[UNITY_MODULE];
    expect(createFaceTracker().kind).toBe('fake');
    expect(createAvatarRenderer().kind).toBe('fake');
  });
});
