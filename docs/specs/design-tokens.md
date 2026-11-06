# 스펙: design-tokens

상태: 구현됨 (2026-11-06)

## 목적

`docs/DESIGN_SYSTEM.md`의 색·글꼴·간격·모서리 값을 코드 한 곳(`packages/design-tokens/tokens.json`)에 두고, React Native와 Unity가 같은 값을 생성물로 받게 한다. UI 코드의 리터럴 값을 없애는 기반이다.

## 범위

- `tokens.json` 원본 (색 18개 × 2테마, 글꼴 패밀리 2, 텍스트 스타일 8, 간격 7, 모서리 4)
- 생성 스크립트 `scripts/generate.ts` → `dist/tokens.ts`(RN), `dist/Tokens.cs`(Unity `Murmur.Design.Tokens`)
- `--check` 모드: 생성물이 원본과 다르면 실패 (CI용)
- WCAG 대비 계산기 `src/contrast.ts` (테스트 전용)
- 컴포넌트 치수(버튼 52, 통화 컨트롤 56, 터치 영역 48)와 모션(물결 1.2초, 3개) 상수

## 범위 밖

- 글꼴 파일 번들 (apps/mobile 책임)
- 테마 결정 로직 `resolveTheme` (apps/mobile/src/theme 책임)
- Unity 쪽 Tokens.cs를 Unity 프로젝트로 복사하는 빌드 단계 (apps/avatar-unity 책임)

## 완료 조건

- [x] `pnpm --filter @murmur/design-tokens generate:check` 통과
- [x] 모든 테마에서 문서 §3 조합표의 글자/배경 대비가 본문 4.5:1, 컨트롤 3:1 이상
- [x] 문서 표에 적힌 대비 수치와 계산값이 소수 둘째 자리까지 일치
- [x] 간격이 4px 배수, 모서리·텍스트 스타일이 문서 §4~6과 일치
- [x] kebab-case → camelCase(TS), PascalCase(C#) 변환 테스트
- [x] 생성 C# 파일의 중괄호 균형

## 토큰 추가 절차

1. `tokens.json`에 추가하고 `docs/DESIGN_SYSTEM.md` 표를 같이 고친다.
2. 글자색이면 `test/contrast.test.ts`의 조합 목록과 `DOCUMENTED`에 추가한다.
3. `pnpm generate` 후 생성물을 함께 커밋한다.
