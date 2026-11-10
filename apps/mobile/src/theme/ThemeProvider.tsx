import React, { createContext, useMemo } from 'react';
import type { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { color, motion, radius, size, space, text } from '@murmur/design-tokens';
import type { ColorPalette, ThemeId } from '@murmur/design-tokens';
import type { ScreenKind, ThemePreference } from '@murmur/shared-types';
import { resolveTheme } from './resolveTheme';
import { platformFontFamily } from './fontFamily';
import { useReduceMotion } from './useReduceMotion';

type TextStyles = {
  -readonly [K in keyof typeof text]: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    fontWeight: (typeof text)[K]['fontWeight'];
  };
};

export interface Theme {
  id: ThemeId;
  color: ColorPalette;
  space: typeof space;
  radius: typeof radius;
  text: TextStyles;
  size: typeof size;
  motion: typeof motion;
  /** OS "동작 줄이기". true면 물결 같은 반복 애니메이션을 정지 상태로 그린다. */
  reduceMotion: boolean;
}

export const ThemeContext = createContext<Theme | null>(null);

export interface ThemeProviderProps {
  screen: ScreenKind;
  userPreference?: ThemePreference;
  /** 테스트·스토리북용. 지정하면 OS 설정을 무시한다. */
  reduceMotionOverride?: boolean;
}

function buildTextStyles(): TextStyles {
  const entries = Object.entries(text).map(([key, s]) => [
    key,
    { ...s, fontFamily: platformFontFamily(s.fontFamily, s.fontWeight) },
  ]);
  return Object.fromEntries(entries) as TextStyles;
}

const TEXT_STYLES = buildTextStyles();

export function ThemeProvider({
  screen,
  userPreference = 'system',
  reduceMotionOverride,
  children,
}: PropsWithChildren<ThemeProviderProps>): React.JSX.Element {
  const scheme = useColorScheme();
  const reduceMotion = useReduceMotion(reduceMotionOverride);

  const id = resolveTheme({
    screen,
    userPreference,
    systemScheme: scheme === 'dark' ? 'dark' : 'light',
  });
  const value = useMemo<Theme>(
    () => ({ id, color: color[id], space, radius, text: TEXT_STYLES, size, motion, reduceMotion }),
    [id, reduceMotion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
