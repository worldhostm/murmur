import { NativeModules, Platform } from 'react-native';

/**
 * 지원 기기 판정 (docs/specs/device-support.md, PLANNING.md "지원 기기").
 *  - iOS: Face ID 기기만 (ARKit 얼굴 추적 지원 여부로 판정)
 *  - Android: 2020년 이후 출시 기기만. 출하 시 Android 버전(first_api_level)이 10(API 29) 이상이면 2020년 이후 출시로 본다.
 */
export type UnsupportedReason =
  | 'ok'
  | 'os-too-old'
  | 'launched-before-2020'
  | 'no-front-camera'
  | 'no-face-tracking'
  | 'no-64bit'
  | 'unknown';

export interface DeviceSupport {
  supported: boolean;
  reason: UnsupportedReason;
  /** 로그·문의용 기기 식별 정보. 개인 식별 정보는 넣지 않는다. */
  details: Record<string, string | number | boolean>;
}

export interface AndroidDeviceInfo {
  manufacturer: string;
  model: string;
  device: string;
  sdkInt: number;
  /** 출하 시 API 레벨. 모르면 0. */
  firstApiLevel: number;
  frontCamera: boolean;
  arm64: boolean;
  ramMb: number;
}

/** 2020년 1월 31일 이후 출시 기기는 Android 10 이상으로 출하되어야 했다 (Google GMS 요건). */
export const ANDROID_MIN_FIRST_API_LEVEL = 29;
/** 현재 OS 최소 버전. minSdkVersion 과 같다. */
export const ANDROID_MIN_SDK_INT = 29;

export function evaluateAndroidSupport(info: AndroidDeviceInfo): DeviceSupport {
  const details = { ...info };
  if (info.sdkInt < ANDROID_MIN_SDK_INT) return { supported: false, reason: 'os-too-old', details };
  if (!info.arm64) return { supported: false, reason: 'no-64bit', details };
  if (!info.frontCamera) return { supported: false, reason: 'no-front-camera', details };
  if (info.firstApiLevel > 0 && info.firstApiLevel < ANDROID_MIN_FIRST_API_LEVEL) {
    return { supported: false, reason: 'launched-before-2020', details };
  }
  // first_api_level 을 모르는 기기: OS 가 10 이상이면 통과시키되 reason 으로 표시해 둔다 (지표 수집용).
  return { supported: true, reason: info.firstApiLevel > 0 ? 'ok' : 'unknown', details };
}

interface DeviceSupportNative {
  getInfo(): Promise<AndroidDeviceInfo & { platform: string }>;
}
interface FaceTrackerNative {
  isSupported(): Promise<boolean>;
}

export async function getDeviceSupport(): Promise<DeviceSupport> {
  if (Platform.OS === 'ios') {
    const tracker = NativeModules.MurmurFaceTracker as FaceTrackerNative | undefined;
    if (!tracker) return missingModule('MurmurFaceTracker');
    const ok = await tracker.isSupported();
    return { supported: ok, reason: ok ? 'ok' : 'no-face-tracking', details: { platform: 'ios' } };
  }
  if (Platform.OS === 'android') {
    const mod = NativeModules.MurmurDeviceSupport as DeviceSupportNative | undefined;
    if (!mod) return missingModule('MurmurDeviceSupport');
    const info = await mod.getInfo();
    return evaluateAndroidSupport(info);
  }
  return { supported: false, reason: 'unknown', details: { platform: Platform.OS } };
}

/**
 * 네이티브 모듈이 없을 때. 개발 빌드는 열어 두고(에뮬레이터·테스트), 배포 빌드는 닫는다.
 * 배포 빌드에서 모듈이 없다는 것은 빌드 구성 오류이므로 열어 두면 안 된다.
 */
function missingModule(name: string): DeviceSupport {
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  return { supported: dev, reason: 'unknown', details: { missingModule: name } };
}
