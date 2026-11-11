import { act, renderHook, waitFor } from '@testing-library/react-native';
import smile from '@murmur/face-protocol/fixtures/smile.json';
import { blendShapeIndex } from '@murmur/face-protocol';
import { FakeAvatarRenderer } from './FakeAvatarRenderer';
import { FakeFaceTracker } from './FakeFaceTracker';
import { useFaceTracking } from './useFaceTracking';

describe('useFaceTracking', () => {
  it('starts the tracker, pushes encoded frames to local and remote slots, and reports tracking', async () => {
    const tracker = new FakeFaceTracker({ frames: [smile], manual: true });
    const renderer = new FakeAvatarRenderer();
    const { result, unmount } = renderHook(() =>
      useFaceTracking({
        enabled: true,
        mirrorToRemote: true,
        reduceMotion: true,
        createTracker: () => tracker,
        createRenderer: () => renderer,
      }),
    );
    await waitFor(() => expect(renderer.loaded.get('remote')).toBe('builtin/primitive'));
    await waitFor(() => expect(renderer.motion).toBe('reduced'));
    await waitFor(() => expect(result.current.status).toBe('starting'));
    act(() => {
      tracker.tick();
      tracker.tick();
    });
    await waitFor(() => expect(result.current.status).toBe('tracking'));
    expect(renderer.frameCount).toBe(4); // 2 frames × 2 slots
    expect(
      renderer.lastFrame.get('remote')!.blendShapes[blendShapeIndex('mouthSmileLeft')],
    ).toBeCloseTo(0.8, 3);
    unmount();
    expect(renderer.disposed).toBe(true);
  });

  it('stays idle when disabled and does not create adapters', () => {
    const createTracker = jest.fn();
    const { result } = renderHook(() => useFaceTracking({ enabled: false, createTracker }));
    expect(result.current.status).toBe('idle');
    expect(createTracker).not.toHaveBeenCalled();
  });

  it('maps a camera-denied rejection to permission-denied', async () => {
    const tracker = new FakeFaceTracker({ manual: true });
    tracker.start = () =>
      Promise.reject(Object.assign(new Error('denied'), { code: 'E_CAMERA_DENIED' }));
    const { result } = renderHook(() =>
      useFaceTracking({
        enabled: true,
        createTracker: () => tracker,
        createRenderer: () => new FakeAvatarRenderer(),
      }),
    );
    await waitFor(() => expect(result.current.status).toBe('permission-denied'));
  });
});

it('does not start tracking if an avatar finishes loading after unmount', async () => {
  let loaded!: () => void;
  const renderer = new FakeAvatarRenderer();
  renderer.loadAvatar = () =>
    new Promise<void>((resolve) => {
      loaded = resolve;
    });
  const tracker = new FakeFaceTracker({ manual: true });
  const start = jest.spyOn(tracker, 'start');
  const { unmount } = renderHook(() =>
    useFaceTracking({
      enabled: true,
      createTracker: () => tracker,
      createRenderer: () => renderer,
    }),
  );
  await waitFor(() => expect(loaded).toBeDefined());
  unmount();
  await act(async () => loaded());
  expect(start).not.toHaveBeenCalled();
  expect(renderer.disposed).toBe(true);
});
