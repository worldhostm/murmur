import type { ImageSourcePropType } from 'react-native';
import type { AiCharacterId } from '@murmur/shared-types';
import seoDoyoon from '../../assets/characters/seo-doyoon.png';
import leonHart from '../../assets/characters/leon-hart.png';
import hanSeorin from '../../assets/characters/han-seorin.png';
import sera from '../../assets/characters/sera.png';
import leeJunseo from '../../assets/characters/lee-junseo.png';
import kai from '../../assets/characters/kai.png';
import haJun from '../../assets/characters/ha-jun.png';
import noah from '../../assets/characters/noah.png';
import jeonYuhyeon from '../../assets/characters/jeon-yuhyeon.png';
import yoonArin from '../../assets/characters/yoon-arin.png';
import ciel from '../../assets/characters/ciel.png';
import doHayeon from '../../assets/characters/do-hayeon.png';
import jiYuna from '../../assets/characters/ji-yuna.png';
import moka from '../../assets/characters/moka.png';

/**
 * 캐릭터 초상(기본 표정). scripts/export-character-thumbnails.py 가 Unity 아틀라스 첫 칸을 잘라 만든다.
 * 137×240. 통화·솔로 화면의 실제 아바타는 Unity 가 그리고, 이 이미지는 목록·이름표 같은 RN 화면용이다.
 * 2026-11-12 로스터 10인은 프로필 시트의 상반신 1포즈를 자른 초상이다 (scripts/slice-character-profiles.py).
 * 표정 아틀라스(Unity)와 그림 출처가 달라 같은 캐릭터라도 포즈·화질이 다르다 (docs/specs/character-roster.md 범위 밖).
 */
const PORTRAITS: Record<AiCharacterId, ImageSourcePropType> = {
  'seo-doyoon': seoDoyoon,
  'leon-hart': leonHart,
  'han-seorin': hanSeorin,
  sera,
  'lee-junseo': leeJunseo,
  kai,
  'ha-jun': haJun,
  noah,
  'jeon-yuhyeon': jeonYuhyeon,
  'yoon-arin': yoonArin,
  ciel,
  'do-hayeon': doHayeon,
  'ji-yuna': jiYuna,
  moka,
};

/** 초상 가로/세로 비 (137/240). */
export const PORTRAIT_ASPECT = 137 / 240;

export function characterPortrait(id: AiCharacterId): ImageSourcePropType {
  return PORTRAITS[id];
}
