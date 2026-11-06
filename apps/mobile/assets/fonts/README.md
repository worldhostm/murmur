# 글꼴

DESIGN_SYSTEM.md §4: Noto Serif KR(display), Noto Sans KR(sans)을 OFL 라이선스로 번들한다.

여기에 아래 파일을 넣고 `npx react-native-asset`(또는 네이티브 프로젝트 생성 시 자동 링크)으로 연결한다.

- `NotoSansKR-Regular.ttf` (400), `NotoSansKR-Medium.ttf` (500), `NotoSansKR-SemiBold.ttf` (600), `NotoSansKR-Bold.ttf` (700)
- `NotoSerifKR-SemiBold.ttf` (600)

출처: https://fonts.google.com/noto/specimen/Noto+Sans+KR , https://fonts.google.com/noto/specimen/Noto+Serif+KR (SIL Open Font License 1.1)

토큰의 `fontFamily`는 패밀리 이름("Noto Sans KR")이다. Android에서 파일명 기반으로 매칭되도록 `src/theme/fontFamily.ts`가 굵기별 파일명으로 바꿔 준다.
