import { fontFamily } from '@murmur/design-tokens';
import { resolveFontFamily } from './fontFamily';

it.each(['400', '500', '600', '700'])(
  'uses an explicit system fallback for weight %s while fonts are unbundled',
  (weight) => {
    for (const family of [fontFamily.sans, fontFamily.display]) {
      expect(resolveFontFamily(family, weight, 'android', false)).toBe('sans-serif');
      expect(resolveFontFamily(family, weight, 'ios', false)).toBe('System');
    }
  },
);
it.each([
  ['400', 'Regular'],
  ['500', 'Medium'],
  ['600', 'SemiBold'],
  ['700', 'Bold'],
])('maps bundled sans %s to the exact asset face', (weight, suffix) => {
  expect(resolveFontFamily(fontFamily.sans, weight, 'android', true)).toBe(`NotoSansKR-${suffix}`);
  expect(resolveFontFamily(fontFamily.sans, weight, 'ios', true)).toBe(`NotoSansKR-${suffix}`);
});
it('only selects faces present in the manifest and leaves unrelated font families alone', () => {
  expect(resolveFontFamily(fontFamily.display, '600', 'ios', true)).toBe('NotoSerifKR-SemiBold');
  expect(resolveFontFamily(fontFamily.display, '700', 'ios', true)).toBe('System');
  expect(resolveFontFamily('Custom', '400', 'ios', false)).toBe('Custom');
});
