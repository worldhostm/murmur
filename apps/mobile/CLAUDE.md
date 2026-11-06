# @murmur/mobile

React Native 앱 셸. 일반 화면 전부를 TypeScript로 만든다. 아바타 렌더는 Unity 임베드(apps/avatar-unity)가 맡고, 통화 화면의 `avatar-renderer` 자리에 들어간다.

## 주요 파일

- `src/theme/` `ThemeProvider`(resolveTheme + 동작 줄이기 감지), `useTheme`(토큰 접근 유일 통로), `withAlpha`
- `src/i18n/` i18next 설정과 `locales/ko.json`, `locales/en.json`. 모든 문구는 여기 키로만
- `src/components/` AppText, Primary/SecondaryButton, AiCharacterBadge, ChatBubble, CharacterCard, CallControl, SpeakingIndicator, MoodCard, Screen
- `src/screens/` Onboarding, CharacterSelect, Solo, Call
- `src/navigation/AppNavigator.tsx` 임시 내비게이터. 네이티브 프로젝트 생성 후 react-navigation으로 교체
- `src/test/render.tsx` 두 테마로 렌더하는 테스트 헬퍼

## 테스트

```bash
pnpm --filter @murmur/mobile test        # jest (react-native preset)
pnpm --filter @murmur/mobile typecheck
```

- 컴포넌트·화면은 `describe.each(THEMES)`로 light/dark 스냅샷을 남긴다.
- "동작 줄이기"는 `renderWithTheme(ui, { reduceMotion: true })`로 검증한다.
- 네이티브 프로젝트(ios/, android/)는 아직 없다. `npx @react-native-community/cli init`로 생성한 뒤 이 src/를 붙인다. 글꼴은 `assets/fonts/README.md`.

## 규칙

- RN `Text`를 직접 쓰지 않고 `AppText`를 쓴다. 색·간격·모서리 리터럴은 ESLint가 막는다.
- AI 캐릭터가 나오는 모든 화면에 `AiCharacterBadge`를 둔다. 테스트가 확인한다.
- 화면당 `PrimaryButton`은 하나.
- 새 글자/배경 조합은 `packages/design-tokens/test/contrast.test.ts`에 먼저 추가한다.
- 원본 카메라 영상은 어떤 상태·props에도 담지 않는다. 트래킹 결과는 `@murmur/face-protocol` 프레임으로만 다룬다.
