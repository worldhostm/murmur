import { act, renderHook, waitFor } from '@testing-library/react-native';
import { classifyFrame } from '@murmur/expression-cues';
import type { SpriteExpression } from '@murmur/expression-cues';
import { FakeAvatarRenderer } from './FakeAvatarRenderer';
import { useAvatarExpression } from './useAvatarExpression';

describe('useAvatarExpression', () => {
  it('loads the character into the visible slot and pushes a frame that resolves to the requested expression', async () => {
    const renderer = new FakeAvatarRenderer();
    const { result, rerender, unmount } = renderHook(
      ({ expression }: { expression: SpriteExpression }) =>
        useAvatarExpression({
          enabled: true,
          assetKey: 'characters/sera/front',
          expression,
          createRenderer: () => renderer,
        }),
      { initialProps: { expression: 'worried' as SpriteExpression } },
    );
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(renderer.loaded.get('remote')).toBe('characters/sera/front');
    await waitFor(() => expect(result.current.pushes).toBe(1));
    expect(classifyFrame(renderer.lastFrame.get('remote')!)).toBe('worried');

    rerender({ expression: 'bigSmile' });
    await waitFor(() => expect(result.current.pushes).toBe(2));
    expect(classifyFrame(renderer.lastFrame.get('remote')!)).toBe('bigSmile');

    unmount();
    expect(renderer.disposed).toBe(true);
  });

  it('re-sends the same expression on the heartbeat', async () => {
    jest.useFakeTimers();
    try {
      const renderer = new FakeAvatarRenderer();
      const { result } = renderHook(() =>
        useAvatarExpression({
          enabled: true,
          assetKey: 'characters/sera/front',
          expression: 'smile',
          heartbeatMs: 100,
          createRenderer: () => renderer,
        }),
      );
      await act(async () => {
        await Promise.resolve();
      });
      expect(result.current.ready).toBe(true);
      act(() => {
        jest.advanceTimersByTime(350);
      });
      expect(renderer.frameCount).toBe(4); // 즉시 1 + 100ms 마다 3
    } finally {
      jest.useRealTimers();
    }
  });

  it('does nothing while disabled', () => {
    const createRenderer = jest.fn(() => new FakeAvatarRenderer());
    const { result } = renderHook(() =>
      useAvatarExpression({
        enabled: false,
        assetKey: 'characters/sera/front',
        expression: 'neutral',
        createRenderer,
      }),
    );
    expect(result.current.ready).toBe(false);
    expect(createRenderer).not.toHaveBeenCalled();
  });
});
