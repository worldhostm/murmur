# 캐릭터 존재감: 목록 초상, 아바타 고정 토글, 살아 있는 배경

작성: 2026-11-10. 상태: 구현됨 (Android 에뮬레이터 확인).

## 목적

1. **캐릭터 고르기 화면에 캐릭터 얼굴이 보인다.** 지금은 글자 카드뿐이다.
2. **솔로 채팅에서 아바타를 계속 볼지, 대화와 같이 스크롤할지 사용자가 고른다.** 지금은 아바타 카드가 대화와 함께 스크롤되어 내려가면 사라진다.
3. **아바타가 가만히 서 있지 않고 살아 있어 보인다.** 미세한 숨쉬기·흔들림과 배경의 느린 빛 움직임. OS "동작 줄이기"면 멈춘다 (DESIGN_SYSTEM.md §8 체크리스트).

## 범위

### 1. 캐릭터 목록 초상 (apps/mobile)

- `scripts/export-character-thumbnails.py` (MVP 4인. 2026-11-12 로스터 10인은 상반신 표정 세트에서 `scripts/slice-character-expressions.py` 가 만든다): Unity 아틀라스 `apps/avatar-unity/Assets/Murmur/Resources/Characters/<id>.png` 의 첫 칸(기본 표정, 137×240)을 잘라 `apps/mobile/assets/characters/<id>.png` 로 저장한다. `slice-expression-sheet.py` 를 다시 돌리면 이 스크립트도 돌린다(문서화).
- `src/avatar/characterImages.ts`: `characterPortrait(id)` → `require` 한 이미지 소스. 캐릭터 4종.
- `CharacterCard`: 왼쪽에 초상(높이 `space[12] × 2.5`, 137:240 비율, `radius.md`, 배경 `night`), 오른쪽에 기존 글자. 이미지 `testID="character-portrait-<id>"`, 접근성은 카드 라벨(이름)에 포함.
- `SoloScreen` 상단 이름 옆 보라색 원 → 같은 초상을 원형으로 자른 썸네일.
- 테스트(jest): 카드가 초상을 그린다, 스냅샷 갱신.

### 2. 아바타 고정 토글 (apps/mobile)

- `SoloScreen` 에 `defaultAvatarPinned`(기본 **true**: 캐릭터가 항상 보이는 쪽을 기본으로 둔다) 와 내부 상태. 아바타 카드 오른쪽 위에 pill 토글(`solo-avatar-pin`): 고정이면 "고정됨" 글리프 📌, 아니면 "같이 스크롤". i18n `solo.avatarPinned` / `solo.avatarScrolls`, 접근성 라벨 포함.
- 고정: `Screen fill` 로 바꾸고 아바타 카드를 스크롤 밖 상단에 두며, 이름·말풍선·칩·입력·기분 카드·친구 통화 버튼은 아래 `ScrollView`(`solo-scroll`)에 넣는다. 말풍선 영역이 바뀌면 끝으로 스크롤한다.
- 해제: 지금처럼 한 `ScrollView` 안에 전부.
- 설정은 세션 안에서만 유지(영속 저장은 범위 밖).
- 테스트: 토글을 누르면 라벨·testID 가 바뀌고 두 모드 모두 아바타·입력·보내기가 있다. 고정 모드에서 `solo-scroll` 이 있고 아바타는 그 밖에 있다.

### 3. 살아 있는 아바타·배경 (apps/avatar-unity + 브리지)

- `MotionSettings.cs`: 전역 `Reduced` 플래그와 변경 이벤트. `MurmurBridge.SetMotion("reduced"|"full")`.
- `IdleMotion.cs`: `SpriteSheetAvatarLoader.Build` 가 루트에 붙인다. 루트 transform 에 숨쉬기 스케일(±1.2%, 3.2초), 상하 bob(±0.006, 4.1초), roll 흔들림(±1.2°, 5.3초)을 사인으로 합성. 표정 드라이버가 움직이는 피벗과는 다른 노드라 충돌하지 않는다. `Reduced` 면 정지 자세로 되돌린다.
- `AmbientBackground.cs`: `ThemeBackground.Awake` 가 카메라에 붙인다. 아바타 뒤(z = −1.2)에 부드러운 빛 덩어리 3개(런타임 생성 방사형 알파 텍스처 128², 쿼드) 를 두고 각각 다른 주기(9~14초)의 리사주 경로로 천천히 떠다니며 알파가 숨쉬듯 변한다. 색은 토큰(Brand·Lavender·Accent, 알파 0.12~0.2)에서 테마별로 고른다(`ApplyTheme`). `Reduced` 면 제자리에 멈춘다.
- 머티리얼: `Editor/SceneSetup.EnsureGlowMaterial` 이 `Resources/Murmur/GlowUnlit.mat`(URP Unlit, Transparent, ZWrite off)을 만들고 `BuildLibrary` 가 빌드 전에 보장한다 (셰이더 변형이 빌드에 포함되도록).
- 브리지: Android `UnityBridgeModule.setMotion` → `UnityPlayerProxy.setMotion`(SetTheme 처럼 준비 전 큐). iOS `MurmurUnityBridge.setMotion` + `.m` 선언. JS `AvatarRendererAdapter.setMotion(reduced)` (Unity·Fake 구현). `useFaceTracking`·`useAvatarExpression` 이 `reduceMotion` 옵션을 받아 로드 후와 값이 바뀔 때 보낸다. `theme/useReduceMotion.ts` 로 OS 설정 구독을 분리해 `ThemeProvider` 와 `AppNavigator` 가 함께 쓴다.
- 테스트: Unity EditMode — IdleMotion 이 시간에 따라 루트를 움직이고 Reduced 면 정지 자세, AmbientBackground 가 빛 3개를 만들고 테마에 따라 색이 바뀌며 Reduced 면 위치가 고정, SetMotion 파싱. jest — 훅이 `setMotion` 을 로드 후·변경 시 보낸다, FakeAvatarRenderer 기록.

## 범위 밖

- 토글 설정의 영속 저장(AsyncStorage).
- 눈 깜빡임·입 모양 같은 셀 단위 애니메이션(시트에 칸이 없다), 셀 크로스페이드.
- 통화 화면의 레이아웃 변경(배경 애니메이션은 같은 씬이라 통화 화면에도 적용된다).
- iOS 실기기 검증.

## 완료 조건

- [x] `pnpm --filter @murmur/mobile test`: 초상·토글·setMotion 테스트 통과, 스냅샷 갱신.
- [x] `pnpm unity:test`: IdleMotion·AmbientBackground·SetMotion 테스트 통과.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm unity:export:android && pnpm android:build` 통과.
- [x] Android 에뮬레이터: 캐릭터 고르기 카드에 초상, 솔로 화면 토글로 고정/스크롤 전환, 아바타가 숨쉬고 배경 빛이 움직인다(1.5초 간격 두 프레임의 아바타 카드 픽셀 차이 16.9%). `adb shell settings put global transition_animation_scale 0`(RN 의 AccessibilityInfo.isReduceMotionEnabled 가 Android 에서 읽는 값)을 켜고 다시 띄우면 멈춘다(차이 0%).

## 열린 질문

- 토글 기본값: 고정(true) 으로 둔다. 대화 공간이 좁다는 의견이 나오면 바꾼다.
- 배경 빛의 색·세기는 토큰 범위 안에서 디자인 검토 후 조정.
