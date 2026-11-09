import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { AppNavigator } from './AppNavigator';
import type { ChatReplyAdapter } from '../chat';

const supported = { supported: true, reason: 'ok' as const, details: {} };

describe('AppNavigator', () => {
  it('shows the unsupported-device screen and nothing else when the device fails the gate', () => {
    render(
      <AppNavigator
        deviceSupportOverride={{ supported: false, reason: 'launched-before-2020', details: {} }}
      />,
    );
    expect(screen.getByTestId('screen-unsupported-device')).toBeTruthy();
    expect(screen.getByTestId('unsupported-reason').props.children).toBe(
      '2020년 이전에 출시된 기기예요',
    );
    expect(screen.queryByTestId('screen-onboarding')).toBeNull();
  });

  it('resolves support from native when no override is given (dev build without module → open)', async () => {
    render(<AppNavigator />);
    await waitFor(() => expect(screen.getByTestId('screen-onboarding')).toBeTruthy());
  });

  it('walks onboarding → character select → solo → random match', () => {
    render(<AppNavigator deviceSupportOverride={supported} />);
    expect(screen.getByTestId('screen-onboarding')).toBeTruthy();
    fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(screen.getByTestId('screen-character-select')).toBeTruthy();
    fireEvent.press(screen.getByTestId('character-card-han-seorin'));
    fireEvent.press(screen.getByTestId('character-select-confirm'));
    expect(screen.getByTestId('screen-solo')).toBeTruthy();
    fireEvent.press(screen.getByTestId('solo-call-friend'));
    expect(screen.getByTestId('screen-call')).toBeTruthy();
  });

  it('back buttons walk solo → character select → onboarding, and Android BACK does the same', () => {
    const addListener = jest.spyOn(BackHandler, 'addEventListener');
    render(
      <AppNavigator
        deviceSupportOverride={supported}
        initialRoute={{ name: 'solo', characterId: 'sera' }}
      />,
    );
    fireEvent.press(screen.getByTestId('back-button'));
    expect(screen.getByTestId('screen-character-select')).toBeTruthy();
    fireEvent.press(screen.getByTestId('back-button'));
    expect(screen.getByTestId('screen-onboarding')).toBeTruthy();
    expect(screen.queryByTestId('back-button')).toBeNull();

    fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(screen.getByTestId('screen-character-select')).toBeTruthy();
    const hardwareBack = addListener.mock.calls[
      addListener.mock.calls.length - 1
    ]![1] as () => boolean;
    let handled = false;
    act(() => {
      handled = hardwareBack();
    });
    expect(handled).toBe(true);
    expect(screen.getByTestId('screen-onboarding')).toBeTruthy();
    addListener.mockRestore();
  });

  it('solo chat: my message gets a character reply from the adapter, with the avatar card on screen', async () => {
    const reply = jest.fn(async () => ({
      text: '됐고. 뭐가 막혔는데.',
      expression: 'serious' as const,
    }));
    const adapter: ChatReplyAdapter = { kind: 'scripted', reply };
    render(
      <AppNavigator
        deviceSupportOverride={supported}
        initialRoute={{ name: 'solo', characterId: 'sera' }}
        replyAdapter={adapter}
      />,
    );
    expect(screen.getByTestId('solo-avatar')).toBeTruthy();
    fireEvent.changeText(screen.getByTestId('solo-input'), '오늘 좀 힘들었어');
    fireEvent.press(screen.getByTestId('solo-send'));
    expect(screen.getByText('오늘 좀 힘들었어')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('됐고. 뭐가 막혔는데.')).toBeTruthy());
    expect(reply).toHaveBeenCalledWith({
      characterId: 'sera',
      history: [],
      text: '오늘 좀 힘들었어',
    });
    expect(screen.getAllByTestId('ai-character-badge').length).toBeGreaterThanOrEqual(1);
  });

  it('solo chat: the default scripted adapter answers in the character voice', async () => {
    render(
      <AppNavigator
        deviceSupportOverride={supported}
        initialRoute={{ name: 'solo', characterId: 'sera' }}
      />,
    );
    fireEvent.changeText(screen.getByTestId('solo-input'), 'ㅋㅋㅋ 완전 좋아');
    fireEvent.press(screen.getByTestId('solo-send'));
    await waitFor(() => expect(screen.getByText('오, 됐네. 그거 해냈잖아.')).toBeTruthy(), {
      timeout: 3000,
    });
  });
});
