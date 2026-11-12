import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { AppNavigator } from './AppNavigator';

// 테스트는 서버 없이 스크립트 답만 쓴다.
jest.mock('../config', () => ({ AI_CHARACTER_URL: undefined }));
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

  it('walks onboarding → character select → solo → friend lobby', () => {
    render(<AppNavigator deviceSupportOverride={supported} />);
    expect(screen.getByTestId('screen-onboarding')).toBeTruthy();
    fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(screen.getByTestId('screen-character-select')).toBeTruthy();
    fireEvent.press(screen.getByTestId('character-card-han-seorin'));
    fireEvent.press(screen.getByTestId('character-select-confirm'));
    expect(screen.getByTestId('screen-solo')).toBeTruthy();
    fireEvent.press(screen.getByTestId('solo-call-friend'));
    expect(screen.getByTestId('screen-call-lobby')).toBeTruthy();
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
    expect(screen.getByTestId('solo-avatar-toggle')).toBeTruthy();
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

function deferredReply() {
  let resolve!: (value: { text: string }) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<{ text: string }>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function openSolo(reply: ChatReplyAdapter['reply']) {
  return render(
    <AppNavigator
      deviceSupportOverride={supported}
      initialRoute={{ name: 'solo', characterId: 'sera' }}
      replyAdapter={{ kind: 'scripted', reply }}
    />,
  );
}

function sendText(text: string) {
  fireEvent.changeText(screen.getByTestId('solo-input'), text);
  fireEvent.press(screen.getByTestId('solo-send'));
}

it('serializes turns, preserves the next draft, and includes the previous reply in history', async () => {
  const first = deferredReply();
  const reply = jest
    .fn()
    .mockReturnValueOnce(first.promise)
    .mockResolvedValue({ text: 'second answer' });
  openSolo(reply);
  sendText('first');
  sendText('next draft');
  fireEvent.press(screen.getAllByTestId('solo-sample')[0]!);
  await act(async () => {});
  expect(reply).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('solo-input').props.value).toBe('next draft');
  expect(screen.getByText('답변을 기다리고 있어요')).toBeTruthy();
  await act(async () => first.resolve({ text: 'first answer' }));
  fireEvent.press(screen.getByTestId('solo-send'));
  await waitFor(() => expect(reply).toHaveBeenCalledTimes(2));
  expect(reply.mock.calls[1][0]).toEqual({
    characterId: 'sera',
    text: 'next draft',
    history: [
      { from: 'me', text: 'first' },
      { from: 'character', text: 'first answer' },
    ],
  });
});

it('shows failure and releases the send lock even for a synchronously throwing adapter', async () => {
  const reply = jest
    .fn()
    .mockImplementationOnce(() => {
      throw new Error('offline');
    })
    .mockResolvedValue({ text: 'recovered' });
  openSolo(reply);
  sendText('hello');
  await waitFor(() =>
    expect(
      screen.getByText('답변을 받지 못했어요. 잠시 후 다시 메시지를 보내 주세요.'),
    ).toBeTruthy(),
  );
  sendText('again');
  await waitFor(() => expect(screen.getByText('recovered')).toBeTruthy());
  expect(screen.queryByTestId('solo-reply-status')).toBeNull();
});

it.each(['success', 'failure'])(
  'ignores late %s after leaving for a call and reopening solo',
  async (outcome) => {
    const old = deferredReply();
    const fresh = deferredReply();
    const reply = jest.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(fresh.promise);
    openSolo(reply);
    sendText('old message');
    await act(async () => {});
    fireEvent.press(screen.getByTestId('solo-call-friend'));
    await act(async () => {});
    fireEvent.press(screen.getByTestId('back-button'));
    fireEvent.press(screen.getByTestId('character-select-confirm'));
    expect(screen.queryByText('old message')).toBeNull();
    sendText('fresh message');
    await act(async () => {
      if (outcome === 'success') old.resolve({ text: 'old answer' });
      else old.reject(new Error('late failure'));
    });
    expect(screen.queryByText('old answer')).toBeNull();
    expect(screen.getByText('답변을 기다리고 있어요')).toBeTruthy();
    await act(async () => fresh.resolve({ text: 'fresh answer' }));
    expect(screen.getByText('fresh answer')).toBeTruthy();
    expect(reply.mock.calls[1][0].history).toEqual([]);
  },
);

it('creates a new remote session when reopening the same character', async () => {
  const { RemoteReplyAdapter } = jest.requireActual('../chat');
  const sessions: string[] = [];
  const spy = jest.spyOn(RemoteReplyAdapter.prototype, 'reply').mockImplementation(function (this: {
    sessionId: string;
  }) {
    sessions.push(this.sessionId);
    return Promise.resolve({ text: 'remote answer' });
  });
  const config = jest.requireMock('../config');
  config.AI_CHARACTER_URL = 'http://example.test';
  try {
    render(
      <AppNavigator
        deviceSupportOverride={supported}
        initialRoute={{ name: 'solo', characterId: 'sera' }}
      />,
    );
    sendText('first session');
    await waitFor(() => expect(screen.getByText('remote answer')).toBeTruthy());
    fireEvent.press(screen.getByTestId('back-button'));
    fireEvent.press(screen.getByTestId('character-select-confirm'));
    sendText('second session');
    await waitFor(() => expect(sessions).toHaveLength(2));
    expect(sessions[0]).not.toBe(sessions[1]);
  } finally {
    config.AI_CHARACTER_URL = undefined;
    spy.mockRestore();
  }
});

it('lets unsupported devices enter text-only solo without a Unity view', async () => {
  render(
    <AppNavigator
      deviceSupportOverride={{ supported: false, reason: 'launched-before-2020', details: {} }}
    />,
  );
  fireEvent.press(screen.getByTestId('continue-text'));
  fireEvent.press(screen.getByTestId('character-card-sera'));
  fireEvent.press(screen.getByTestId('character-select-confirm'));
  expect(screen.getByTestId('screen-solo')).toBeTruthy();
  expect(screen.queryByTestId('solo-avatar')).toBeNull();
  await act(async () => {});
});
