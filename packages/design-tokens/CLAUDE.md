# @murmur/design-tokens

디자인 토큰의 단일 원본. `docs/DESIGN_SYSTEM.md`의 표와 같은 값이어야 한다.

- 원본: `tokens.json`. 여기만 고친다.
- 생성: `pnpm generate` → `dist/tokens.ts`(React Native), `dist/Tokens.cs`(Unity, `Murmur.Design.Tokens`). 생성물은 커밋하되 직접 수정하지 않는다.
- `src/contrast.ts`: WCAG 대비 계산. 테스트 전용.
- 테스트: `pnpm test`. 생성물 최신 여부, 대비 기준(본문 4.5:1, 컨트롤 3:1), 문서 표와의 일치, 4px 그리드를 검사한다.

규칙
- 토큰을 추가·변경하면 `docs/DESIGN_SYSTEM.md`의 표와 `test/contrast.test.ts`의 `DOCUMENTED`를 같이 고친다.
- 새 글자/배경 조합을 UI에서 쓰려면 `BODY_TEXT_PAIRS`(또는 `UI_PAIRS`)에 먼저 추가해 대비를 통과시킨다.
