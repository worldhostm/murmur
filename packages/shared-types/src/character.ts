/** 아바타 표현 방식 (PLANNING.md "캐릭터 표현 방식과 에셋"). */
export type AvatarStyle = 'stylized-3d' | 'mascot' | 'portrait';

/** 아바타 에셋 출처. 업로드와 실사형은 검수 체계가 갖춰진 뒤 연다. */
export type AvatarSource = 'builtin' | 'customized' | 'uploaded';

export interface AvatarRef {
  id: string;
  style: AvatarStyle;
  source: AvatarSource;
  /** VRM/glTF 또는 실사형 이미지의 저장소 키. 원본 카메라 영상은 절대 여기 들어가지 않는다. */
  assetKey: string;
}

/** MVP 초기 AI 캐릭터 4종 ID. 설정 문서는 services/ai-character/characters/<id>.md. */
export type AiCharacterId = 'seo-doyoon' | 'leon-hart' | 'han-seorin' | 'sera';

export const AI_CHARACTER_IDS: readonly AiCharacterId[] = [
  'seo-doyoon',
  'leon-hart',
  'han-seorin',
  'sera',
] as const;

/** 캐릭터가 선호하는 테마. 서도윤·레온은 밤, 한서린·세라는 낮 장면이 기본이다. */
export type SceneTone = 'night' | 'light';

export interface AiCharacterSummary {
  id: AiCharacterId;
  /** i18n 키. 실제 이름 문구는 apps/mobile/src/i18n에서 가져온다. */
  nameKey: string;
  taglineKey: string;
  roleKey: string;
  tone: SceneTone;
  /** 로맨스형 대화는 18세 이상 인증 사용자에게만 연다. */
  adultOnlyRomance: boolean;
  avatar: AvatarRef;
}

export const AI_CHARACTERS: readonly AiCharacterSummary[] = [
  {
    id: 'seo-doyoon',
    nameKey: 'character.seo-doyoon.name',
    taglineKey: 'character.seo-doyoon.tagline',
    roleKey: 'character.seo-doyoon.role',
    tone: 'night',
    adultOnlyRomance: true,
    avatar: { id: 'av-seo-doyoon', style: 'portrait', source: 'builtin', assetKey: 'characters/seo-doyoon/front' },
  },
  {
    id: 'leon-hart',
    nameKey: 'character.leon-hart.name',
    taglineKey: 'character.leon-hart.tagline',
    roleKey: 'character.leon-hart.role',
    tone: 'night',
    adultOnlyRomance: true,
    avatar: { id: 'av-leon-hart', style: 'portrait', source: 'builtin', assetKey: 'characters/leon-hart/front' },
  },
  {
    id: 'han-seorin',
    nameKey: 'character.han-seorin.name',
    taglineKey: 'character.han-seorin.tagline',
    roleKey: 'character.han-seorin.role',
    tone: 'light',
    adultOnlyRomance: true,
    avatar: { id: 'av-han-seorin', style: 'portrait', source: 'builtin', assetKey: 'characters/han-seorin/front' },
  },
  {
    id: 'sera',
    nameKey: 'character.sera.name',
    taglineKey: 'character.sera.tagline',
    roleKey: 'character.sera.role',
    tone: 'light',
    adultOnlyRomance: true,
    avatar: { id: 'av-sera', style: 'portrait', source: 'builtin', assetKey: 'characters/sera/front' },
  },
] as const;
