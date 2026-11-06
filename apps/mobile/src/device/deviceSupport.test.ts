import { evaluateAndroidSupport } from './deviceSupport';
import type { AndroidDeviceInfo } from './deviceSupport';

const base: AndroidDeviceInfo = {
  manufacturer: 'samsung',
  model: 'SM-A217N', // Galaxy A21s (2020)
  device: 'a21s',
  sdkInt: 31,
  firstApiLevel: 29,
  frontCamera: true,
  arm64: true,
  ramMb: 3000,
};

describe('evaluateAndroidSupport (2020년 이후 출시 기기만)', () => {
  it('accepts a 2020 budget device shipped with Android 10', () => {
    expect(evaluateAndroidSupport(base)).toMatchObject({ supported: true, reason: 'ok' });
  });

  it('rejects a device launched before 2020 even if upgraded to Android 10+', () => {
    // Galaxy S9 (2018, shipped with Android 8 = API 26, upgraded to Android 10)
    expect(evaluateAndroidSupport({ ...base, model: 'SM-G960N', firstApiLevel: 26, sdkInt: 29 })).toMatchObject({
      supported: false,
      reason: 'launched-before-2020',
    });
  });

  it('rejects an OS older than Android 10', () => {
    expect(evaluateAndroidSupport({ ...base, sdkInt: 28, firstApiLevel: 28 })).toMatchObject({ reason: 'os-too-old' });
  });

  it('rejects devices without a front camera or 64-bit ABI', () => {
    expect(evaluateAndroidSupport({ ...base, frontCamera: false })).toMatchObject({ reason: 'no-front-camera' });
    expect(evaluateAndroidSupport({ ...base, arm64: false })).toMatchObject({ reason: 'no-64bit' });
  });

  it('passes an unknown first_api_level on Android 10+ but flags it as unknown', () => {
    expect(evaluateAndroidSupport({ ...base, firstApiLevel: 0 })).toMatchObject({ supported: true, reason: 'unknown' });
  });

  it('keeps details for diagnostics without personal data', () => {
    const r = evaluateAndroidSupport(base);
    expect(Object.keys(r.details).sort()).toEqual(
      ['arm64', 'device', 'firstApiLevel', 'frontCamera', 'manufacturer', 'model', 'ramMb', 'sdkInt'],
    );
  });
});
