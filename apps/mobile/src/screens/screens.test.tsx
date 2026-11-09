import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { CallScreen, CharacterSelectScreen, OnboardingScreen, SoloScreen } from './index';
import { renderWithTheme, THEMES } from '../test/render';

describe.each(THEMES)('screens snapshot (%s)', (theme) => {
  it('OnboardingScreen', () => {
    expect(
      renderWithTheme(<OnboardingScreen onStart={() => undefined} />, { theme }).toJSON(),
    ).toMatchSnapshot();
  });
  it('SoloScreen', () => {
    expect(
      renderWithTheme(
        <SoloScreen
          characterId="han-seorin"
          messages={[]}
          onSend={() => undefined}
          onSaveMood={() => undefined}
          onCallFriend={() => undefined}
        />,
        { theme },
      ).toJSON(),
    ).toMatchSnapshot();
  });
  it('CallScreen with AI peer', () => {
    expect(
      renderWithTheme(
        <CallScreen
          mode="ai-call"
          state="connected"
          peer={{
            id: 'ai',
            isAi: true,
            aiCharacterId: 'seo-doyoon',
            avatarId: 'av',
            displayNameKey: 'character.seo-doyoon.name',
          }}
          peerSpeaking
          onToggleMute={() => undefined}
          onSwapAvatar={() => undefined}
          onReport={() => undefined}
          onEnd={() => undefined}
        />,
        { theme, reduceMotion: true },
      ).toJSON(),
    ).toMatchSnapshot();
  });
});

describe('OnboardingScreen', () => {
  it('calls onStart', () => {
    const onStart = jest.fn();
    renderWithTheme(<OnboardingScreen onStart={onStart} />);
    fireEvent.press(screen.getByTestId('onboarding-start'));
    expect(onStart).toHaveBeenCalled();
    expect(screen.getByText('전송되는 건 표정 수치와 목소리뿐이에요')).toBeTruthy();
  });
});

describe('CharacterSelectScreen', () => {
  it('lists 4 AI characters, each with an AI badge, and confirms the selection', () => {
    const onConfirm = jest.fn();
    renderWithTheme(<CharacterSelectScreen onConfirm={onConfirm} />);
    expect(screen.getAllByTestId('ai-character-badge')).toHaveLength(4);
    fireEvent.press(screen.getByTestId('character-select-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('character-card-sera'));
    fireEvent.press(screen.getByTestId('character-select-confirm'));
    expect(onConfirm).toHaveBeenCalledWith('sera');
  });
});

describe('SoloScreen', () => {
  const base = {
    characterId: 'seo-doyoon' as const,
    onSend: jest.fn(),
    onSaveMood: jest.fn(),
    onCallFriend: jest.fn(),
  };

  it('always shows the AI character badge and the greeting first', () => {
    renderWithTheme(<SoloScreen {...base} messages={[]} />);
    expect(screen.getAllByTestId('ai-character-badge').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('오늘 어땠어?')).toBeTruthy();
    expect(screen.getAllByText('서도윤').length).toBeGreaterThanOrEqual(1);
  });

  it('sends trimmed text and clears the input', () => {
    const onSend = jest.fn();
    renderWithTheme(<SoloScreen {...base} onSend={onSend} messages={[]} />);
    fireEvent.changeText(screen.getByTestId('solo-input'), '  오늘 좀 힘들었어  ');
    fireEvent.press(screen.getByTestId('solo-send'));
    expect(onSend).toHaveBeenCalledWith('오늘 좀 힘들었어');
    expect(screen.getByTestId('solo-input').props.value).toBe('');
  });

  it('shows a back button at the top when onBack is given', () => {
    const onBack = jest.fn();
    renderWithTheme(<SoloScreen {...base} onBack={onBack} messages={[]} />);
    fireEvent.press(screen.getByTestId('back-button'));
    expect(onBack).toHaveBeenCalled();
    expect(screen.getByLabelText('뒤로')).toBeTruthy();
  });

  it('sends a sample prompt chip as-is (dev-only expression test aid)', () => {
    const onSend = jest.fn();
    renderWithTheme(
      <SoloScreen
        {...base}
        onSend={onSend}
        messages={[]}
        samplePrompts={['오늘 너무 힘들었어', 'ㅋㅋㅋ 완전 좋아']}
      />,
    );
    expect(screen.getAllByTestId('solo-sample')).toHaveLength(2);
    fireEvent.press(screen.getByText('ㅋㅋㅋ 완전 좋아'));
    expect(onSend).toHaveBeenCalledWith('ㅋㅋㅋ 완전 좋아');
  });

  it('has no back button without onBack', () => {
    renderWithTheme(<SoloScreen {...base} messages={[]} />);
    expect(screen.queryByTestId('back-button')).toBeNull();
  });

  it('offers a path to human connection', () => {
    const onCallFriend = jest.fn();
    renderWithTheme(<SoloScreen {...base} onCallFriend={onCallFriend} messages={[]} />);
    fireEvent.press(screen.getByTestId('solo-call-friend'));
    expect(onCallFriend).toHaveBeenCalled();
  });

  it('shows a gentle rest suggestion for long or late-night sessions', () => {
    renderWithTheme(<SoloScreen {...base} messages={[]} restSuggestion="late-night" />);
    expect(screen.getByTestId('rest-suggestion')).toBeTruthy();
    expect(screen.getByText('늦은 시간이에요. 이야기는 내일 이어서 해도 괜찮아요')).toBeTruthy();
  });
});

describe('CallScreen', () => {
  const handlers = {
    onToggleMute: jest.fn(),
    onSwapAvatar: jest.fn(),
    onReport: jest.fn(),
    onEnd: jest.fn(),
  };

  it('shows AI badge + notice for an AI peer, none for a human peer', () => {
    renderWithTheme(
      <CallScreen
        mode="ai-call"
        state="connected"
        peer={{ id: 'a', isAi: true, avatarId: 'x', displayName: '세라' }}
        {...handlers}
      />,
    );
    expect(screen.getByTestId('ai-character-badge')).toBeTruthy();
    expect(screen.getByText('상대는 AI 캐릭터예요')).toBeTruthy();

    screen.unmount();
    renderWithTheme(
      <CallScreen
        mode="random-match"
        state="connected"
        peer={{ id: 'b', isAi: false, avatarId: 'y', displayName: '익명' }}
        {...handlers}
      />,
    );
    expect(screen.queryAllByTestId('ai-character-badge')).toHaveLength(0);
    expect(screen.queryByText('상대는 AI 캐릭터예요')).toBeNull();
  });

  it('report and end are one tap away', () => {
    renderWithTheme(
      <CallScreen
        mode="random-match"
        state="connected"
        peer={{ id: 'b', isAi: false, avatarId: 'y', displayName: '익명' }}
        {...handlers}
      />,
    );
    fireEvent.press(screen.getByTestId('call-report'));
    fireEvent.press(screen.getByTestId('call-end'));
    expect(handlers.onReport).toHaveBeenCalled();
    expect(handlers.onEnd).toHaveBeenCalled();
  });

  it('shows the matching copy while connecting in random-match', () => {
    renderWithTheme(
      <CallScreen
        mode="random-match"
        state="connecting"
        peer={{ id: 'b', isAi: false, avatarId: 'y', displayName: '' }}
        {...handlers}
      />,
    );
    expect(screen.getByText('이야기 나눌 사람을 찾는 중이에요')).toBeTruthy();
  });
});
