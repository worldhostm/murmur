import { useContext } from 'react';
import { ThemeContext } from './ThemeProvider';
import type { Theme } from './ThemeProvider';

/** 컴포넌트에서 토큰에 접근하는 유일한 통로. 리터럴 색·간격은 쓰지 않는다. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme은 ThemeProvider 안에서만 쓸 수 있습니다.');
  return theme;
}
