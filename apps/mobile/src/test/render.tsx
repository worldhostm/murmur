import React from 'react';
import { render } from '@testing-library/react-native';
import type { RenderOptions } from '@testing-library/react-native';
import type { ThemeId } from '@murmur/design-tokens';
import { ThemeProvider } from '../theme';

export const THEMES: ThemeId[] = ['light', 'dark'];

export interface RenderWithThemeOptions extends RenderOptions {
  theme?: ThemeId;
  reduceMotion?: boolean;
}

/** 두 테마 모두 스냅샷을 남긴다 (DESIGN_SYSTEM.md §0-4). userPreference로 테마를 강제한다. */
export function renderWithTheme(ui: React.ReactElement, { theme = 'light', reduceMotion = false, ...rest }: RenderWithThemeOptions = {}) {
  return render(
    <ThemeProvider screen="other" userPreference={theme} reduceMotionOverride={reduceMotion}>
      {ui}
    </ThemeProvider>,
    rest,
  );
}
