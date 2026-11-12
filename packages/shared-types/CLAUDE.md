# @murmur/shared-types

apps와 services가 함께 쓰는 도메인 타입. 런타임 코드는 상수(캐릭터 목록, 안전 기준값)만 둔다.

- `theme.ts` ThemeId/ThemePreference/ScreenKind — 테마 결정 입력
- `character.ts` 아바타 참조, AI 캐릭터 14종 요약(MVP 4 + 로스터 10)과 컨셉 4종(`charactersByConcept`). 문구는 i18n 키로만 (docs/specs/character-roster.md)
- `call.ts` 대화 모드, 세션, 참가자(`isAi` 플래그는 "AI 캐릭터" 표시의 근거)
- `safety.ts` 신고·제재·연령 게이트·솔로 모드 안전 기준

표정 데이터 타입은 여기 두지 않는다. `@murmur/face-protocol`이 담당한다.
