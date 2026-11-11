import { Platform } from 'react-native';

declare const __DEV__: boolean | undefined;

const isDev = typeof __DEV__ !== 'undefined' && __DEV__ === true;

/**
 * ai-character 서버 주소. 개발 빌드 기본값은 에뮬레이터/시뮬레이터에서 Mac 의 localhost:8787.
 * 실기기는 Mac 의 LAN IP 로 바꾼다 (docs/REMAINING_WORK.md). 릴리스 빌드는 비어 있으면 스크립트 답만 쓴다.
 * TODO: 빌드 설정(react-native-config 등)으로 주입.
 */
export const AI_CHARACTER_URL: string | undefined = isDev
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:8787'
    : 'http://localhost:8787'
  : undefined;

/** Local signaling gateway. Production URL must be explicitly configured. */
export const SIGNALING_URL: string | undefined = isDev
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:8788'
    : 'http://localhost:8788'
  : undefined;
