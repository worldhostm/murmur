import type { ImageSourcePropType } from 'react-native';
import type { AiCharacterId } from '@murmur/shared-types';
import seoDoyoon from '../../assets/characters/seo-doyoon.png';
import leonHart from '../../assets/characters/leon-hart.png';
import hanSeorin from '../../assets/characters/han-seorin.png';
import sera from '../../assets/characters/sera.png';

/**
 * 캐릭터 초상(기본 표정). scripts/export-character-thumbnails.py 가 Unity 아틀라스 첫 칸을 잘라 만든다.
 * 137×240. 통화·솔로 화면의 실제 아바타는 Unity 가 그리고, 이 이미지는 목록·이름표 같은 RN 화면용이다.
 * 출시 예정 캐릭터(AVAILABLE_CHARACTERS 에 없는 id)는 초상이 없다. 화면은 쓸 수 있는 캐릭터만 그리므로 여기 오지 않는다.
 */
const PORTRAITS: Partial<Record<AiCharacterId, ImageSourcePropType>> = {
  'seo-doyoon': seoDoyoon,
  'leon-hart': leonHart,
  'han-seorin': hanSeorin,
  sera,
};

/** 초상 가로/세로 비 (137/240). */
export const PORTRAIT_ASPECT = 137 / 240;

export function characterPortrait(id: AiCharacterId): ImageSourcePropType {
  const source = PORTRAITS[id];
  if (!source) throw new Error(`출시 예정 캐릭터 '${id}' 는 초상이 없다. AVAILABLE_CHARACTERS 만 화면에 그린다.`);
  return source;
}
