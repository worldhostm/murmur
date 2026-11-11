# @murmur/mobile

React Native 앱 셸. 일반 화면 전부를 TypeScript로 만든다. 아바타 렌더는 Unity 임베드(apps/avatar-unity)가 맡고, 통화 화면의 `avatar-renderer` 자리에 들어간다.

## 주요 파일

- `src/theme/` `ThemeProvider`(resolveTheme + 동작 줄이기 감지), `useTheme`(토큰 접근 유일 통로), `withAlpha`, `useReduceMotion`(OS 동작 줄이기 구독. ThemeProvider 와 AppNavigator 가 함께 쓰고, 렌더러 `setMotion` 으로 Unity 에도 전달)
- `src/i18n/` i18next 설정과 `locales/ko.json`, `locales/en.json`. 모든 문구는 여기 키로만
- `src/components/` AppText, Primary/SecondaryButton, AiCharacterBadge, ChatBubble, CharacterCard, CallControl, SpeakingIndicator, MoodCard, Screen
- `src/screens/` Onboarding, CharacterSelect, Solo, Call
- `src/navigation/AppNavigator.tsx` 임시 내비게이터. 네이티브 프로젝트 생성 후 react-navigation으로 교체
- `src/test/render.tsx` 두 테마로 렌더하는 테스트 헬퍼
- `src/avatar/` 트래커·렌더러 어댑터. `createFaceTracker()`/`createAvatarRenderer()`가 네이티브 모듈이 있으면 `NativeFaceTracker`/`UnityAvatarRenderer`, 없으면(개발 빌드) 가짜 구현을 돌려준다. `base64.ts`는 의존성 없는 base64. `useFaceTracking`은 통화 화면(카메라 → 프레임), `useAvatarExpression`은 솔로 화면(표정 이름 → `@murmur/expression-cues` 프리셋 프레임, 카메라 없음). 둘 다 `remote` 슬롯이 화면에 보이는 슬롯이다
- `src/chat/` 솔로 채팅 답 어댑터 `ChatReplyAdapter`. `RemoteReplyAdapter`는 ai-character 서버의 `POST /chat`을 부른다(세션 id 로 서버가 기록을 잇는다). `ScriptedReplyAdapter`는 서버가 없을 때의 자리표시자로, i18n `reply.<id>.<down|up|neutral>` 대사를 사용자 말의 단서 그룹에 맞춰 돌려주고 위기 키워드엔 `safety.crisisBody`를 낸다. `FallbackReplyAdapter(remote, scripted)`가 원격 실패 시 경고 로그 후 스크립트로 넘어간다
- `src/config.ts` `AI_CHARACTER_URL`. 개발 빌드는 Android 에뮬레이터 `http://10.0.2.2:8787`, iOS 시뮬레이터 `http://localhost:8787`. 실기기는 Mac 의 LAN IP 로 바꾼다. 릴리스는 비어 있으면 스크립트 답만

## 네이티브 모듈

iOS (`ios/Murmur/`, Swift + ObjC `RCT_EXTERN_MODULE`, 브리징 헤더 `Murmur-Bridging-Header.h`)
- `MurmurFaceTracker.swift/.m`: ARKit 얼굴 트래킹 (Face ID 기기만, `isSupported`). `start/stop/setDirectToUnity`. 이벤트 `murmur.faceFrame` `{ frame: base64, slot: 'local' }` 최대 30Hz, `murmur.trackingState` `{ state }`는 바뀔 때만
- `FaceFrameEncoder.swift`: face-protocol 144바이트 인코더. `Generated/FaceProtocol.swift`는 `packages/face-protocol/dist/generated`에서 복사한 생성물(수정 금지)
- `MurmurUnityBridge.swift/.m`: 모듈 `MurmurUnity` (`loadAvatar/pushFrame/setTheme/setMotion/dispose`). Unity 임베드 전까지 `LoggingUnityProxy`. GameObject `MurmurBridge`의 `OnFaceFrame("<slot>|<base64>")`, `LoadAvatar("<slot>|<assetKey>")`, `SetTheme("light"|"dark")`, `SetMotion("full"|"reduced")`
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

### Unity as a Library (iOS)

- `pnpm unity:export:ios` + `pnpm unity:export:ios-simulator` → `pnpm unity:framework:ios` 가 `apps/avatar-unity/Builds/ios/UnityFramework.xcframework`(Device arm64 + Simulator x86_64, 각 프레임워크 안에 `Data` 복사)와 `MurmurUnity.podspec` 을 만든다. `ios/Podfile` 은 그 podspec 이 있으면 `pod 'MurmurUnity'` 를 자동 포함한다. 없으면 앱은 Unity 없이 빌드된다.
- Swift 는 `import UnityFramework` 를 하지 않는다. `MurmurUnityBridge.swift` 의 `DynamicUnityProxy` 가 런타임에 `Frameworks/UnityFramework.framework` 를 `Bundle.load()` 하고 ObjC 선택자(`getInstance`, `setExecuteHeader:`, `setDataBundleId:`, `runEmbeddedWithArgc:argv:appLaunchOpts:`, `sendMessageToGOWithName:functionName:message:`, `appController`, `pause:`)로 구동한다. 프레임워크가 없으면 `LoggingUnityProxy`.
- `MurmurUnityViewManager`(네이티브 이름 `MurmurUnityView`) 가 Unity 의 `appController.rootView` 를 컨테이너에 넣고, 창에서 빠지면 `pause:`. JS 는 Android 와 같은 `<UnityView />`.
- Unity 의 시뮬레이터 라이브러리는 x86_64 뿐이라 podspec 이 `EXCLUDED_ARCHS[sdk=iphonesimulator*]=arm64` 를 건다. Apple Silicon 에서는 시뮬레이터 앱이 x86_64(Rosetta)로 돌아간다. Unity 를 빼고 arm64 로 빌드하려면 podspec 을 지우고 `pod install`.
- 빌드: `cd ios && pod install && xcodebuild -workspace Murmur.xcworkspace -scheme Murmur -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build`

### 솔로 대화 수명

- `AppNavigator`는 한 번에 하나의 응답만 요청하며 대기 중 다음 초안은 유지한다. 최종 어댑터 실패는 화면에 안내한다.
- 솔로 이탈 시 요청 세대 번호를 올려 늦은 성공·실패를 무시하고 화면 기록을 비운다. 같은 캐릭터라도 재입장하면 새 원격 세션을 쓴다. 서버 기록 삭제나 네트워크 취소를 의미하지 않는다.
- 상세 기획: `docs/specs/solo-conversation-reliability.md`.
