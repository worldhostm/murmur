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

/**
 * AI 캐릭터 ID. MVP 4종 + 2026-11-12 로스터 10종. 설정 문서는 services/ai-character/characters/<id>.md,
 * 아틀라스는 apps/avatar-unity/Assets/Murmur/Resources/Characters/<id>.png.
 */
export type AiCharacterId =
  | 'seo-doyoon'
  | 'leon-hart'
  | 'han-seorin'
  | 'sera'
  | 'lee-junseo'
  | 'kai'
  | 'ha-jun'
  | 'noah'
  | 'jeon-yuhyeon'
  | 'yoon-arin'
  | 'ciel'
  | 'do-hayeon'
  | 'ji-yuna'
  | 'moka';

export const AI_CHARACTER_IDS: readonly AiCharacterId[] = [
  'seo-doyoon',
  'leon-hart',
  'han-seorin',
  'sera',
  'lee-junseo',
  'kai',
  'ha-jun',
  'noah',
  'jeon-yuhyeon',
  'yoon-arin',
  'ciel',
  'do-hayeon',
  'ji-yuna',
  'moka',
] as const;

/** 캐릭터가 선호하는 장면 톤. 밤 장면은 night 테마, 낮 장면은 light 테마가 기본이다. */
export type SceneTone = 'night' | 'light';

/**
 * 캐릭터 컨셉 (docs/specs/character-roster.md). 생김새·세계관·솔로 모드 역할로 나눈 네 갈래.
 * 캐릭터 선택 화면은 이 순서대로 묶어 보여 준다.
 * - quiet-night: 어두운 색감, 낮은 목소리. 하루 끝에 말없이 곁을 지킨다.
 * - bright-stage: 밝은 머리색·무대 조명. 에너지로 분위기를 바꾼다.
 * - steady-ally: 단정한 실루엣·또렷한 눈빛. 막힌 일을 같이 푼다.
 * - other-world: 현실 밖 세계관의 색(은발·네온·라벤더). 다른 시선으로 하루를 본다.
 */
export type CharacterConcept = 'quiet-night' | 'bright-stage' | 'steady-ally' | 'other-world';

export interface CharacterConceptSummary {
  id: CharacterConcept;
  /** i18n 키 concept.<id>.name */
  nameKey: string;
  /** i18n 키 concept.<id>.description */
  descriptionKey: string;
}

export const CHARACTER_CONCEPTS: readonly CharacterConceptSummary[] = [
  { id: 'quiet-night', nameKey: 'concept.quiet-night.name', descriptionKey: 'concept.quiet-night.description' },
  { id: 'bright-stage', nameKey: 'concept.bright-stage.name', descriptionKey: 'concept.bright-stage.description' },
  { id: 'steady-ally', nameKey: 'concept.steady-ally.name', descriptionKey: 'concept.steady-ally.description' },
  { id: 'other-world', nameKey: 'concept.other-world.name', descriptionKey: 'concept.other-world.description' },
] as const;

export interface AiCharacterSummary {
  id: AiCharacterId;
  /** i18n 키. 실제 이름 문구는 apps/mobile/src/i18n에서 가져온다. */
  nameKey: string;
  taglineKey: string;
  roleKey: string;
  /** 설정상 나이. 모두 성인이다. */
  age: number;
  tone: SceneTone;
  concept: CharacterConcept;
  /** 로맨스형 대화는 18세 이상 인증 사용자에게만 연다. */
  adultOnlyRomance: boolean;
  avatar: AvatarRef;
}

function builtin(
  id: AiCharacterId,
  age: number,
  tone: SceneTone,
  concept: CharacterConcept,
): AiCharacterSummary {
  return {
    id,
    nameKey: `character.${id}.name`,
    taglineKey: `character.${id}.tagline`,
    roleKey: `character.${id}.role`,
    age,
    tone,
    concept,
    adultOnlyRomance: true,
    avatar: { id: `av-${id}`, style: 'portrait', source: 'builtin', assetKey: `characters/${id}/front` },
  };
}

export const AI_CHARACTERS: readonly AiCharacterSummary[] = [
  // MVP 4종 (PLANNING.md "초기 AI 캐릭터 기획")
  builtin('seo-doyoon', 29, 'night', 'quiet-night'),
  builtin('leon-hart', 27, 'night', 'other-world'),
  builtin('han-seorin', 28, 'light', 'quiet-night'),
  builtin('sera', 26, 'light', 'other-world'),
  // 2026-11-12 로스터 10종 (docs/specs/character-roster.md). 순서는 로스터 시트 행 순서.
  builtin('lee-junseo', 25, 'light', 'steady-ally'),
  builtin('kai', 24, 'light', 'bright-stage'),
  builtin('ha-jun', 31, 'night', 'quiet-night'),
  builtin('noah', 28, 'night', 'bright-stage'),
  builtin('jeon-yuhyeon', 30, 'night', 'steady-ally'),
  builtin('yoon-arin', 24, 'light', 'bright-stage'),
  builtin('ciel', 26, 'light', 'other-world'),
  builtin('do-hayeon', 27, 'light', 'steady-ally'),
  builtin('ji-yuna', 29, 'night', 'quiet-night'),
  builtin('moka', 23, 'light', 'bright-stage'),
] as const;

export interface CharacterConceptGroup {
  concept: CharacterConceptSummary;
  characters: readonly AiCharacterSummary[];
}

/** 컨셉 순서대로 캐릭터를 묶는다. 캐릭터가 없는 컨셉은 뺀다. */
export function charactersByConcept(
  characters: readonly AiCharacterSummary[] = AI_CHARACTERS,
): CharacterConceptGroup[] {
  return CHARACTER_CONCEPTS.map((concept) => ({
    concept,
    characters: characters.filter((c) => c.concept === concept.id),
  })).filter((group) => group.characters.length > 0);
}
