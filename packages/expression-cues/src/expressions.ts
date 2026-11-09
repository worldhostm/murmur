/**
 * 표정 시트 10칸. 순서는 시트 열 순서이자 Unity `SpriteExpression` enum 순서
 * (apps/avatar-unity/Assets/Murmur/Scripts/SpriteExpression.cs). 한쪽을 바꾸면 다른 쪽도 바꾼다.
 */
export const SPRITE_EXPRESSIONS = [
  'neutral', // ① 기본(중립)
  'softSmile', // ② 미소(은은)
  'smile', // ③ 미소(살짝)
  'bigSmile', // ④ 활짝 웃음
  'serious', // ⑤ 진지/집중
  'surprised', // ⑥ 놀람
  'flustered', // ⑦ 당황
  'worried', // ⑧ 걱정/염려
  'sad', // ⑨ 슬픔
  'angry', // ⑩ 화남/분노
] as const;

export type SpriteExpression = (typeof SPRITE_EXPRESSIONS)[number];

export function isSpriteExpression(value: unknown): value is SpriteExpression {
  return typeof value === 'string' && (SPRITE_EXPRESSIONS as readonly string[]).includes(value);
}
