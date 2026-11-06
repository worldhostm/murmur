# ADR 0003: 디자인 토큰은 tokens.json 하나에서 TS·C#을 생성한다

날짜: 2026-11-06 · 상태: 승인

## 맥락

React Native(TypeScript)와 Unity(C#)가 같은 색을 그려야 한다. 통화 화면에서 Unity 배경과 RN 오버레이가 맞닿으므로 값이 1이라도 어긋나면 보인다. 손으로 두 곳을 맞추면 언젠가 깨진다.

## 결정

- `packages/design-tokens/tokens.json`을 유일한 원본으로 둔다.
- `pnpm generate`가 `dist/tokens.ts`와 `dist/Tokens.cs`를 만든다. 생성물은 커밋하되 직접 고치지 않는다.
- 테스트가 생성물 최신 여부와 WCAG 대비 기준을 검사한다. 문서 표의 수치도 테스트가 대조한다.
- 모바일 UI 코드의 색 리터럴은 ESLint로 막는다.

## 대안

- Style Dictionary 같은 도구: 유연하지만 설정이 토큰 자체보다 커진다. 포맷이 둘뿐이라 100줄짜리 스크립트가 낫다.
- 런타임에 JSON을 읽기: 타입 안전성이 없고 Unity 쪽은 어차피 상수가 필요하다.

## 결과

- 토큰 추가 절차가 세 단계(JSON, 문서, 테스트)로 고정된다. `docs/specs/design-tokens.md` 참고.
