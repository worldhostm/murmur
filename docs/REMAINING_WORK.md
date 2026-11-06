# 진행하지 못한 작업 (0단계 PoC 기준)

작성: 2026-11-06. 이 문서는 "다음 단계"로 잡았던 항목 중 이 머신·이 세션에서 끝내지 못한 것을 모아 둔다. 각 항목에 **막힌 이유**, **지금까지 해 둔 것**, **이어서 할 일**을 적는다. 끝나면 항목을 지우고 `docs/specs/`의 완료 조건에 체크한다.

## 요약표

| # | 항목 | 상태 | 막힌 이유 |
| --- | --- | --- | --- |
| 1 | iOS 네이티브 빌드 (ARKit 트래커, Unity 브리지) | 코드 작성됨, **미컴파일** | 이 머신에 Xcode와 CocoaPods가 없음 (Command Line Tools만 있음) |
| 2 | Unity 에디터에서 프로젝트 열기·패키지 해석·Test Runner | **완료** (Hub 로그인 후 배치 모드로 임포트, 씬 생성, EditMode 5개 통과) | — |
| 3 | Unity as a Library 내보내기와 RN 연결 | 브리지 양쪽 코드 작성됨, **미연결** | Unity 에디터에 Android/iOS 빌드 모듈이 설치되어 있지 않음 (Mac Standalone만 있음) |
| 4 | VRM 로더 (`IAvatarLoader` 구현)와 VRM 1.0 Expression 매핑 | 인터페이스만 | UniVRM 패키지 해석이 2번에 막힘 |
| 5 | 2020년 보급형 Android 기기 트래킹 품질·지연 측정 | 측정 코드(FrameTimingProbe) 작성됨 | 연결된 기기 없음 (`adb devices` 비어 있음) |
| 6 | Android 앱 실기기·에뮬레이터 실행 (카메라 권한 흐름 포함) | APK 빌드 성공, **미실행** | 기기 없음. 에뮬레이터는 전면 카메라 입력이 없어 트래킹 검증이 안 됨 |
| 7 | react-navigation 교체 | 임시 내비게이터 사용 중 | 네이티브 프로젝트가 생긴 뒤 하기로 한 작업. 우선순위상 뒤로 미룸 |
| 8 | Noto 글꼴 번들 | README만 | 글꼴 파일(수 MB)을 저장소에 넣을지 결정 필요 |
| 9 | 카메라 권한 요청 UI (Android `PermissionsAndroid`, iOS 안내) | 네이티브는 거부 코드 반환 | 화면 설계 필요 (온보딩 어디에 넣을지) |

## 1. iOS 네이티브 빌드

- **해 둔 것**: `apps/mobile/ios/Murmur/` 에 `MurmurFaceTracker.swift/.m`(ARKit, `RCTEventEmitter`), `MurmurUnityBridge.swift/.m`, `FaceFrameEncoder.swift`, `Generated/FaceProtocol.swift`, 브리징 헤더. `project.pbxproj` 에 파일과 `SWIFT_OBJC_BRIDGING_HEADER` 를 손으로 추가했고 `plutil -lint` 는 통과. `Info.plist` 에 `NSCameraUsageDescription` 추가.
- **이어서 할 일**
  1. Xcode 설치 후 `sudo xcode-select -s /Applications/Xcode.app`, `cd apps/mobile/ios && bundle install && bundle exec pod install`.
  2. `xed apps/mobile/ios` 로 열어 빌드. 확인 지점: `import React` 모듈 맵, `RCT_EXTERN_METHOD` 셀렉터와 Swift 시그니처 일치, `ARFaceAnchor.BlendShapeLocation(rawValue:)`, `simd_quatf(simd_float4x4)`.
  3. Face ID 기기(실기기)에서 `MurmurFaceTracker.start()` → `murmur.faceFrame` 이벤트 30Hz 확인. 시뮬레이터는 ARKit 얼굴 추적을 지원하지 않는다.

## 2. Unity 에디터 — 완료

Hub 로그인 후 배치 모드가 동작했다. UniVRM 0.128.3은 `com.vrmc.vrmshaders` 경로가 없고(UniGLTF에 합쳐짐) `com.unity.timeline`을 요구해 매니페스트를 고쳤다. `Assets/Murmur/Scenes/Call.unity` 생성, EditMode 테스트 5개 통과. 로컬 실행 명령은 `pnpm unity:test`.

## 3. Unity as a Library 연결

- **해 둔 것**: 메시지 규약을 양쪽에 고정했다. 게임 오브젝트 `MurmurBridge`, 메서드 `OnFaceFrame("slot|base64")`, `LoadAvatar("slot|assetKey")`, `SetTheme("light"|"dark")`. Android `UnityPlayerProxy.sender`, iOS `UnityFrameworkProxy` 가 연결 지점이고 지금은 로그만 남긴다. 트래커는 `setDirectToUnity(true)` 면 JS 를 거치지 않고 프록시로 보낸다.
- **이어서 할 일**
  1. Unity Hub 에서 에디터에 Android Build Support(+ OpenJDK, SDK/NDK 는 기존 것 사용), iOS Build Support 모듈 추가.
  2. Android: Export Project → `apps/avatar-unity/Builds/android/unityLibrary`. `apps/mobile/android/settings.gradle` 에 `include ':unityLibrary'`, `app/build.gradle` 에 `implementation project(':unityLibrary')`. `MainApplication` 에서 `UnityPlayerProxy.sender = { go, m, msg -> UnityPlayer.UnitySendMessage(go, m, msg) }`. 통화 화면의 `avatar-renderer` 자리에 `UnityPlayer` 뷰를 올리는 ViewManager 추가.
  3. iOS: Export → `Unity-iPhone.xcodeproj` 를 워크스페이스에 추가, `UnityFramework.framework` 임베드, `MurmurUnityBridge.shared.proxy` 를 `UnityFramework` 로 교체.
  4. 카메라 소유권 결정(ADR 0001 의 0단계 질문): 트래커(네이티브)가 카메라를 쥐고 Unity 는 프레임만 받는 현재 구조를 유지할지 확인. Unity 가 카메라를 쓰지 않으므로 충돌은 없어야 한다.
  5. 성능: `FrameTimingProbe` 로그로 프레임 시간과 수신→렌더 지연을 읽는다. 예산은 30fps, 지연 33ms 이내.

## 4. VRM 로더

- **해 둔 것**: `AvatarSlotController` 가 `IAvatarLoader` 를 찾아 `Load(assetKey)` 를 호출한다. `BlendShapeDriver` 는 메시 블렌드셰이프 이름 끝부분으로 ARKit 이름을 자동 매칭한다.
- **이어서 할 일**: UniVRM 의 `Vrm10Instance` 로 로드하고, ARKit 52개 → VRM 1.0 Expression(aa/ih/ou/ee/oh, blink, happy/angry/sad 등) 매핑 테이블을 `VrmExpressionDriver.cs` 로 추가. 마스코트(사람 얼굴이 아닌 모델)는 별도 리타깃 테이블이 필요하다 (PLANNING.md 표 참고).

## 5~6. Android 실기기 측정

- **해 둔 것**: `pnpm android:build` 로 디버그 APK 빌드 성공 (MediaPipe tasks-vision 0.10.14, CameraX 1.3.4 포함). 모델 파일은 gradle 이 내려받는다.
- **이어서 할 일**
  1. 2020년 보급형 기기(예: Galaxy A21s/A31, Redmi 9 급)를 USB 로 연결하고 `pnpm --filter @murmur/mobile android`.
  2. JS 에서 `PermissionsAndroid.request(CAMERA)` 후 `NativeFaceTracker.start()`. `murmur.faceFrame` 이벤트 주기와 `murmur.trackingState` 확인.
  3. 측정 항목: 트래커 결과 주기(목표 30Hz), 입을 벌린 시점 → `jawOpen` 상승까지의 지연(화면 녹화로 측정), CPU/GPU 점유. `Delegate.GPU` 가 실패하는 기기에서는 `Delegate.CPU` 로 폴백하는 코드가 아직 없다.
  4. 결과를 `docs/specs/phase0-poc.md`(새로 작성)에 기록하고 기준 기기를 확정한다.

## 7~9. 앱 쪽 나머지

- react-navigation: `apps/mobile/src/navigation/AppNavigator.tsx` 의 `Route` 를 그대로 스택 라우트로 옮기면 된다. 화면 컴포넌트는 props 만 받으므로 수정이 없다.
- 글꼴: `apps/mobile/assets/fonts/README.md` 의 파일 5개를 넣고 `npx react-native-asset`. 저장소 용량이 부담이면 Git LFS.
- 카메라 권한: 온보딩 두 번째 단계로 "표정만 전송돼요" 설명과 함께 권한 요청을 넣는 안을 권한다. 거부 시 솔로 모드는 텍스트로만 진행 가능해야 한다.
