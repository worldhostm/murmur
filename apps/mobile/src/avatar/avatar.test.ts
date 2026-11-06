import { blendShapeIndex, encodeFrame, frameFromJson, FRAME_BYTE_LENGTH } from '@murmur/face-protocol';
import { FakeAvatarRenderer, FakeFaceTracker } from './index';
import smile from '@murmur/face-protocol/fixtures/smile.json';
import neutral from '@murmur/face-protocol/fixtures/neutral.json';

describe('FakeFaceTracker (fixture replay)', () => {
  it('replays fixture frames through encode/decode and stamps timestamps', async () => {
    const tracker = new FakeFaceTracker({ frames: [neutral, smile], manual: true, loop: false });
    const seen: number[] = [];
    const off = tracker.onFrame((f) => seen.push(f.blendShapes[blendShapeIndex('mouthSmileLeft')]!));
    await tracker.start();
    expect(tracker.tick()).toBe(true);
    expect(tracker.tick()).toBe(true);
    expect(tracker.tick()).toBe(false);
    off();
    expect(seen[0]).toBe(0);
    expect(seen[1]).toBeCloseTo(0.8, 3);
  });

  it('defaults to a neutral frame', async () => {
    const tracker = new FakeFaceTracker({ manual: true });
    let frames = 0;
    tracker.onFrame(() => frames++);
    await tracker.start();
    tracker.tick();
    expect(frames).toBe(1);
  });
});

describe('FakeAvatarRenderer (bridge contract)', () => {
  it('accepts encoded frames only for loaded slots and decodes them', async () => {
    const renderer = new FakeAvatarRenderer();
    const encoded = encodeFrame(frameFromJson(smile as never));
    expect(encoded).toHaveLength(FRAME_BYTE_LENGTH);
    expect(() => renderer.pushFrame('remote', encoded)).toThrow();
    await renderer.loadAvatar('remote', 'characters/sera/front');
    renderer.pushFrame('remote', encoded);
    expect(renderer.frameCount).toBe(1);
    expect(renderer.lastFrame.get('remote')!.blendShapes[blendShapeIndex('mouthSmileRight')]).toBeCloseTo(0.8, 3);
  });

  it('tracker → encode → renderer round trip keeps head pose', async () => {
    const tracker = new FakeFaceTracker({ frames: [smile], manual: true });
    const renderer = new FakeAvatarRenderer();
    await renderer.loadAvatar('local', 'builtin/base');
    tracker.onFrame((f) => renderer.pushFrame('local', encodeFrame(f)));
    await tracker.start();
    tracker.tick();
    const got = renderer.lastFrame.get('local')!;
    const want = frameFromJson(smile as never);
    expect(got.headPose.rotation.w).toBeCloseTo(want.headPose.rotation.w, 5);
    expect(got.tracking).toBe('tracked');
  });
});
