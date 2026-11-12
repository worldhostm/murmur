import React from 'react';
import { View } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme, THEMES } from '../test/render';
import { CharacterSelectScreen } from './CharacterSelectScreen';
import { UnsupportedDeviceScreen } from './UnsupportedDeviceScreen';
import { AvatarPreviewScreen } from './AvatarPreviewScreen';
import { CallLobby } from '../call/CallLobby';
import { MoodPanel } from '../mood/MoodPanel';
import { MoodStore } from '../mood/MoodStore';
import { SegmentedControl, ChatBubble } from '../components';

describe.each(THEMES)('redesigned surfaces (%s)', (theme) => {
  it('character selection', () => {
    expect(
      renderWithTheme(<CharacterSelectScreen initial="han-seorin" onConfirm={jest.fn()} />, {
        theme,
      }).toJSON(),
    ).toMatchSnapshot();
  });
  it('connection lobby', () => {
    expect(
      renderWithTheme(<CallLobby onBack={jest.fn()} onText={jest.fn()} />, { theme }).toJSON(),
    ).toMatchSnapshot();
  });
  it('unsupported-device alternative', () => {
    expect(
      renderWithTheme(
        <UnsupportedDeviceScreen
          support={{ supported: false, reason: 'no-front-camera', details: {} }}
          onContinueText={jest.fn()}
        />,
        { theme },
      ).toJSON(),
    ).toMatchSnapshot();
  });
  it('expression preview', () => {
    expect(
      renderWithTheme(
        <AvatarPreviewScreen
          renderer={<View />}
          status="표정 추적 중"
          onBack={jest.fn()}
          onText={jest.fn()}
        />,
        { theme },
      ).toJSON(),
    ).toMatchSnapshot();
  });
  it('journal entry', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 10, 12, 12));
    try {
      const store = new MoodStore({ read: async () => null, write: async () => {} });
      const view = renderWithTheme(<MoodPanel store={store} />, { theme });
      await act(async () => {});
      expect(view.toJSON()).toMatchSnapshot();
      fireEvent.press(screen.getByRole('tab', { name: '기분 기록 돌아보기' }));
      expect(view.toJSON()).toMatchSnapshot('history');
      view.unmount();
    } finally {
      jest.useRealTimers();
    }
  });
});

it('segments communicate selection and cannot change when disabled', () => {
  const change = jest.fn();
  renderWithTheme(
    <SegmentedControl
      value="invite"
      disabled
      onChange={change}
      options={[
        { value: 'invite', label: '초대' },
        { value: 'join', label: '입장' },
      ]}
    />,
  );
  expect(screen.getByRole('tab', { name: '초대' }).props.accessibilityState.selected).toBe(true);
  fireEvent.press(screen.getByRole('tab', { name: '입장' }));
  expect(change).not.toHaveBeenCalled();
});

it('groups consecutive AI messages without duplicating identity on every bubble', () => {
  renderWithTheme(
    <View>
      <ChatBubble side="other" isAi name="서린" text="첫 문장" />
      <ChatBubble side="other" isAi name="서린" text="이어지는 문장" hideIdentity />
    </View>,
  );
  expect(screen.getAllByTestId('ai-character-badge')).toHaveLength(1);
  expect(screen.getByText('이어지는 문장')).toBeTruthy();
});
