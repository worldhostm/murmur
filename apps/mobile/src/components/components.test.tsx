import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { AI_CHARACTERS } from '@murmur/shared-types';
import { color, size } from '@murmur/design-tokens';
import {
  AiCharacterBadge,
  CallControl,
  CharacterCard,
  ChatBubble,
  MoodCard,
  PrimaryButton,
  SecondaryButton,
  SpeakingIndicator,
} from './index';
import { renderWithTheme, THEMES } from '../test/render';

describe.each(THEMES)('components snapshot (%s)', (theme) => {
  it('PrimaryButton', () => {
    expect(renderWithTheme(<PrimaryButton label="시작하기" />, { theme }).toJSON()).toMatchSnapshot();
  });
  it('SecondaryButton', () => {
    expect(renderWithTheme(<SecondaryButton label="친구와 통화하기" />, { theme }).toJSON()).toMatchSnapshot();
  });
  it('ChatBubble me/other/ai', () => {
    expect(
      renderWithTheme(
        <>
          <ChatBubble side="me" text="안녕" />
          <ChatBubble side="other" name="친구" text="안녕" />
          <ChatBubble side="other" isAi name="서도윤" text="오늘 어땠어?" />
        </>,
        { theme },
      ).toJSON(),
    ).toMatchSnapshot();
  });
  it('CharacterCard', () => {
    expect(renderWithTheme(<CharacterCard character={AI_CHARACTERS[0]!} selected />, { theme }).toJSON()).toMatchSnapshot();
  });
  it('CallControl default/end/report', () => {
    expect(
      renderWithTheme(
        <>
          <CallControl label="음소거" glyph="🎙" />
          <CallControl label="신고" glyph="⚑" variant="report" />
          <CallControl label="통화 끝내기" glyph="✕" variant="end" />
        </>,
        { theme },
      ).toJSON(),
    ).toMatchSnapshot();
  });
  it('MoodCard', () => {
    expect(renderWithTheme(<MoodCard title="오늘 기분 한 줄" />, { theme }).toJSON()).toMatchSnapshot();
  });
});

describe('PrimaryButton', () => {
  it('uses brand/on-brand and the 52 height', () => {
    renderWithTheme(<PrimaryButton label="시작하기" testID="btn" />, { theme: 'light' });
    const btn = screen.getByTestId('btn');
    expect(btn.props.style).toMatchObject({ backgroundColor: color.light.brand, minHeight: size.buttonHeight });
  });
  it('fires onPress and respects disabled', () => {
    const onPress = jest.fn();
    renderWithTheme(<PrimaryButton label="x" onPress={onPress} testID="btn" />);
    fireEvent.press(screen.getByTestId('btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
    renderWithTheme(<PrimaryButton label="y" onPress={onPress} disabled testID="btn2" />);
    fireEvent.press(screen.getByTestId('btn2'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('AiCharacterBadge', () => {
  it('renders the i18n "AI 캐릭터" label with accent color', () => {
    renderWithTheme(<AiCharacterBadge />, { theme: 'dark' });
    const label = screen.getByText('AI 캐릭터');
    expect(label).toBeTruthy();
    const flat = Object.assign({}, ...[label.props.style].flat(Infinity));
    expect(flat.color).toBe(color.dark.accent);
  });
});

describe('ChatBubble', () => {
  it('AI bubble shows the character name and AI badge', () => {
    renderWithTheme(<ChatBubble side="other" isAi name="세라" text="막힌 일, 쪼개 보자" />);
    expect(screen.getByText('세라')).toBeTruthy();
    expect(screen.getByTestId('ai-character-badge')).toBeTruthy();
  });
  it('human bubble has no AI badge', () => {
    renderWithTheme(<ChatBubble side="other" name="친구" text="hi" />);
    expect(screen.queryByTestId('ai-character-badge')).toBeNull();
  });
});

describe('CallControl', () => {
  it('end variant uses danger background; default uses night 80%', () => {
    renderWithTheme(
      <>
        <CallControl label="끝" glyph="✕" variant="end" testID="end" />
        <CallControl label="음소거" glyph="m" testID="mute" />
      </>,
      { theme: 'light' },
    );
    type Styled = { props: { style: { backgroundColor: string; width: number } } };
    const endInner = screen.getByTestId('end').children[0] as unknown as Styled;
    const muteInner = screen.getByTestId('mute').children[0] as unknown as Styled;
    expect(endInner.props.style.backgroundColor).toBe(color.light.danger);
    expect(muteInner.props.style.backgroundColor).toBe('rgba(26, 19, 36, 0.8)');
    expect(muteInner.props.style.width).toBe(size.callControl);
  });
});

describe('SpeakingIndicator', () => {
  it('renders 3 animated rings while speaking', () => {
    renderWithTheme(<SpeakingIndicator speaking />, { reduceMotion: false });
    expect(screen.getAllByTestId('speaking-ring-animated')).toHaveLength(3);
  });
  it('renders static rings when reduce motion is on', () => {
    renderWithTheme(<SpeakingIndicator speaking />, { reduceMotion: true });
    expect(screen.getAllByTestId('speaking-ring-static')).toHaveLength(3);
    expect(screen.queryAllByTestId('speaking-ring-animated')).toHaveLength(0);
  });
  it('renders no rings when silent', () => {
    renderWithTheme(<SpeakingIndicator speaking={false} />);
    expect(screen.queryAllByTestId(/speaking-ring/)).toHaveLength(0);
  });
});
