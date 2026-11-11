import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import type { ServerEvent } from '@murmur/shared-types';
import { renderWithTheme } from '../test/render';
import { CallLobby } from './CallLobby';
import type { ConnectSignaling, SignalingConnection } from './SignalingClient';

it('creates a friend room without random matching, displays peer presence, reports, and closes', async () => {
  let emit!: (event: ServerEvent) => void;
  const send = jest.fn(async () => {});
  const close = jest.fn();
  const connect: ConnectSignaling = async (listener) => {
    emit = listener;
    return { send, close };
  };
  const { unmount } = renderWithTheme(
    <CallLobby connect={connect} onBack={jest.fn()} />,
  );
  await waitFor(() =>
    expect(screen.getByText('친구를 초대하거나 초대 코드로 입장하세요')).toBeTruthy(),
  );
  await act(async () => {
    fireEvent.press(screen.getByTestId('lobby-create'));
  });
  expect(send).toHaveBeenCalledWith({ type: 'create-room', maxParticipants: 2 });
  act(() => emit({ type: 'room-created', sessionId: 'room', code: 'ABC234' }));
  expect(screen.getByText('ABC234')).toBeTruthy();
  act(() => emit({ type: 'peer-joined', sessionId: 'room', peerId: 'friend' }));
  expect(screen.getByText('상대가 입장했어요. 음성 통화는 아직 연결되지 않았어요.')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByText('상대 신고'));
  });
  expect(send).toHaveBeenLastCalledWith({
    type: 'report',
    sessionId: 'room',
    targetId: 'friend',
    reason: 'other',
  });
  unmount();
  expect(close).toHaveBeenCalledTimes(1);
});
it('closes connections that finish opening after the screen is unmounted', async () => {
  let finish!: (connection: SignalingConnection) => void;
  const connect: ConnectSignaling = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const { unmount } = renderWithTheme(
    <CallLobby connect={connect} onBack={jest.fn()} />,
  );
  unmount();
  const close = jest.fn();
  await act(async () => finish({ close, send: jest.fn(async () => {}) }));
  expect(close).toHaveBeenCalledTimes(1);
});
