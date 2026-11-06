# @murmur/mobile

React Native 앱 셸. 일반 화면 전부를 TypeScript로 만든다. 아바타 렌더는 Unity 임베드(apps/avatar-unity)가 맡고, 통화 화면의 `avatar-renderer` 자리에 들어간다.

## 주요 파일

- `src/theme/` `ThemeProvider`(resolveTheme + 동작 줄이기 감지), `useTheme`(토큰 접근 유일 통로), `withAlpha`
- `src/i18n/` i18next 설정과 `locales/ko.json`, `locales/en.json`. 모든 문구는 여기 키로만
- `src/components/` AppText, Primary/SecondaryButton, AiCharacterBadge, ChatBubble, CharacterCard, CallControl, SpeakingIndicator, MoodCard, Screen
- `src/screens/` Onboarding, CharacterSelect, Solo, Call
- `src/navigation/AppNavigator.tsx` 임시 내비게이터. 네이티브 프로젝트 생성 후 react-navigation으로 교체
- `src/test/render.tsx` 두 테마로 렌더하는 테스트 헬퍼
- `src/avatar/` 트래커·렌더러 어댑터. `createFaceTracker()`/`createAvatarRenderer()`가 네이티브 모듈이 있으면 `NativeFaceTracker`/`UnityAvatarRenderer`, 없으면(개발 빌드) 가짜 구현을 돌려준다. `base64.ts`는 의존성 없는 base64

## 네이티브 모듈

iOS (`ios/Murmur/`, Swift + ObjC `RCT_EXTERN_MODULE`, 브리징 헤더 `Murmur-Bridging-Header.h`)
- `MurmurFaceTracker.swift/.m`: ARKit 얼굴 트래킹 (Face ID 기기만, `isSupported`). `start/stop/setDirectToUnity`. 이벤트 `murmur.faceFrame` `{ frame: base64, slot: 'local' }` 최대 30Hz, `murmur.trackingState` `{ state }`는 바뀔 때만
- `FaceFrameEncoder.swift`: face-protocol 144바이트 인코더. `Generated/FaceProtocol.swift`는 `packages/face-protocol/dist/generated`에서 복사한 생성물(수정 금지)
- `MurmurUnityBridge.swift/.m`: 모듈 `MurmurUnity` (`loadAvatar/pushFrame/setTheme/dispose`). Unity 임베드 전까지 `LoggingUnityProxy`. GameObject `MurmurBridge`의 `OnFaceFrame("<slot>|<base64>")`, `LoadAvatar("<slot>|<assetKey>")`, `SetTheme("light"|"dark")`
- direct-to-unity: 통화 중에는 트래커가 JS를 거치지 않고 `MurmurUnityBridge.shared.pushFrame`으로 바로 넘긴다. JS는 상태 이벤트만 받는다
- `Info.plist`에 `NSCameraUsageDescription`. 픽셀 버퍼는 어떤 경로로도 JS·Unity에 가지 않는다

Android는 `android/app/src/main/java/com/murmur/`에 같은 모듈 이름·이벤트·메시지 규격으로 둔다 (MediaPipe Face Landmarker).

## 테스트

```bash
pnpm --filter @murmur/mobile test        # jest (react-native preset)
pnpm --filter @murmur/mobile typecheck
```

- 컴포넌트·화면은 `describe.each(THEMES)`로 light/dark 스냅샷을 남긴다.
- "동작 줄이기"는 `renderWithTheme(ui, { reduceMotion: true })`로 검증한다.
- 네이티브 어댑터는 `src/avatar/native.test.ts`처럼 `react-native`의 `NativeModules`/`NativeEventEmitter`를 Proxy로 mock 해서 검증한다.
- 글꼴은 `assets/fonts/README.md`.

## 규칙

- RN `Text`를 직접 쓰지 않고 `AppText`를 쓴다. 색·간격·모서리 리터럴은 ESLint가 막는다.
- AI 캐릭터가 나오는 모든 화면에 `AiCharacterBadge`를 둔다. 테스트가 확인한다.
- 화면당 `PrimaryButton`은 하나.
- 새 글자/배경 조합은 `packages/design-tokens/test/contrast.test.ts`에 먼저 추가한다.
- 원본 카메라 영상은 어떤 상태·props에도 담지 않는다. 트래킹 결과는 `@murmur/face-protocol` 프레임으로만 다룬다.

### Android (`android/app/src/main/java/`)

- `com/murmur/facetracker/FaceTrackerModule.kt`: CameraX 전면 카메라 → MediaPipe Face Landmarker(LIVE_STREAM, blendshapes + 변환 행렬) → `FaceFrameEncoder`(144바이트) → `murmur.faceFrame` 이벤트 또는 `UnityPlayerProxy`. 픽셀은 이 클래스 밖으로 나가지 않는다.
- `com/murmur/facetracker/HeadPose.kt`: 열 우선 4x4(cm) → 쿼터니언 + 위치(m)
- `com/murmur/unity/UnityPlayerProxy.kt`, `UnityBridgeModule.kt`: `MurmurUnity` 모듈. UaaL 통합 전에는 로그만
- `app/murmur/faceprotocol/FaceProtocol.kt`: 생성물 (`pnpm sync:generated`)
- 모델 `face_landmarker.task`는 gradle `downloadFaceLandmarkerModel`이 내려받는다 (커밋하지 않음)
- 빌드: `pnpm android:build` (ANDROID_HOME, JDK 17). gradle은 모노레포 루트 node_modules를 가리키도록 패치되어 있다 (`settings.gradle`, `app/build.gradle`의 react 블록)

### Unity as a Library (Android)

- `pnpm unity:export:android` 로 `apps/avatar-unity/Builds/android/unityLibrary` 가 생기면 `settings.gradle` 이 자동으로 `:unityLibrary` 를 포함하고, `app/build.gradle` 이 `src/unity/java` 소스셋(UnityHost, UnityViewManager)을 켠다. 없으면 둘 다 빠져서 앱은 그대로 빌드된다.
- `MainApplication` 은 리플렉션으로 `UnityHost.install()` 을 불러 `UnityPlayerProxy.sender/viewFactory/lifecycle` 를 연결한다. `MainActivity` 가 pause/resume/destroy 를 전달한다.
- JS `UnityView` 는 네이티브 `MurmurUnityView` 가 등록돼 있으면 그리고, 아니면 자리 표시만 둔다. 통화 화면의 `renderer` 자리에 넣는다.
