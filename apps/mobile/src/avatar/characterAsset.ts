import { AI_CHARACTERS } from '@murmur/shared-types';
import type { AiCharacterId } from '@murmur/shared-types';

/** VRM·실사형이 붙기 전 테스트 아바타. Unity PrimitiveAvatarLoader 가 처리한다. */
export const PRIMITIVE_ASSET_KEY = 'builtin/primitive';

/**
 * 통화 화면 렌더러에 보낼 아바타 에셋 키. 선택한 AI 캐릭터가 있으면 그 캐릭터의 정면 에셋(characters/<id>/front),
 * 없으면 프리미티브 마스코트. Unity 쪽 SpriteSheetAvatarLoader 가 같은 키 규칙을 쓴다.
 */
export function avatarAssetKeyFor(characterId: AiCharacterId | undefined): string {
  if (!characterId) return PRIMITIVE_ASSET_KEY;
  const character = AI_CHARACTERS.find((c) => c.id === characterId);
  return character?.avatar.assetKey ?? PRIMITIVE_ASSET_KEY;
}
