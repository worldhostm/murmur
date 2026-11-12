import { Platform } from 'react-native';
import { fontFamily } from '@murmur/design-tokens';
import manifest from '../../assets/fonts/manifest.json';

/** Until bundled assets and native registration pass fonts:check, use known system families. */
export function resolveFontFamily(
  family: string,
  weight: string,
  platform: string,
  bundled = manifest.enabled,
): string {
  const known = family === fontFamily.sans || family === fontFamily.display;
  if (!known) return family;
  if (bundled) {
    const asset = manifest.fonts.find((font) => font.family === family && font.weight === weight);
    if (asset)
      return platform === 'android' ? asset.file.replace(/\.ttf$/, '') : asset.postScriptName;
  }
  // Keep a predictable Korean-capable system fallback. Display intentionally uses sans too.
  return platform === 'android' ? 'sans-serif' : 'System';
}

export function platformFontFamily(family: string, weight: string): string {
  return resolveFontFamily(family, weight, Platform.OS);
}
