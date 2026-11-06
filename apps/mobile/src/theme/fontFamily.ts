import { Platform } from 'react-native';
import { fontFamily } from '@murmur/design-tokens';

type Weight = '400' | '500' | '600' | '700';

const FILE_BY_FAMILY: Record<string, string> = {
  [fontFamily.sans]: 'NotoSansKR',
  [fontFamily.display]: 'NotoSerifKR',
};
const SUFFIX_BY_WEIGHT: Record<Weight, string> = {
  '400': 'Regular',
  '500': 'Medium',
  '600': 'SemiBold',
  '700': 'Bold',
};

/**
 * Android는 fontWeight를 패밀리 이름에 합성하지 못하므로 파일명("NotoSansKR-Bold")으로 바꾼다.
 * iOS는 패밀리 이름("Noto Sans KR") + fontWeight로 동작한다.
 */
export function platformFontFamily(family: string, weight: string): string {
  if (Platform.OS !== 'android') return family;
  const file = FILE_BY_FAMILY[family];
  const suffix = SUFFIX_BY_WEIGHT[weight as Weight];
  if (!file || !suffix) return family;
  return `${file}-${suffix}`;
}
