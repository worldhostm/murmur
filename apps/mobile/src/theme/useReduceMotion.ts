import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** OS "동작 줄이기" 구독. ThemeProvider 와 Unity 렌더러(setMotion)가 함께 쓴다. override 가 있으면 OS 값을 무시한다. */
export function useReduceMotion(override?: boolean): boolean {
  const [os, setOs] = useState(false);
  useEffect(() => {
    if (override !== undefined) return;
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => alive && setOs(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOs);
    return () => {
      alive = false;
      sub.remove();
    };
  }, [override]);
  return override ?? os;
}
