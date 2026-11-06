# apps/avatar-unity

Unity(URP) 아바타 렌더러. 앱(React Native)에 라이브러리(Unity as a Library)로 임베드된다. 통화 화면의 아바타와 배경만 그린다. 텍스트 UI는 그리지 않는다.

## 상태

Unity 6 (6000.0.84f1) 프로젝트 뼈대. Unity Hub에서 이 폴더를 열면 Library/ProjectSettings가 생성된다. 씬은 메뉴 `Murmur/Create Call Scene`(또는 `-executeMethod Murmur.Editor.SceneSetup.CreateCallScene`)으로 만든다.
배치 모드: `pnpm unity:test`(EditMode), `pnpm unity:export:android`/`ios`/`ios-simulator`(Unity as a Library 내보내기, `Editor/BuildLibrary.cs`), `pnpm unity:framework:ios`(Device+Simulator 를 `Builds/ios/UnityFramework.xcframework` 로 합치고 `Data` 를 프레임워크 안에 복사, `MurmurUnity.podspec` 생성). 라이선스 없이 컴파일만 보려면 `pnpm unity:compile-check`.

## 스크립트 (Assets/Murmur/Scripts)

| 파일 | 역할 |
| --- | --- |
| `MurmurBridge.cs` | 네이티브가 `UnitySendMessage("MurmurBridge", …)`로 부르는 진입점. `OnFaceFrame("slot|base64")`, `LoadAvatar("slot|assetKey")`, `SetTheme("light"/"dark")` |
| `FaceFrameReceiver.cs` | 슬롯별 최신 프레임 보관 (네이티브 스레드 → 메인 스레드, lock) |
| `AvatarSlotController.cs` | 슬롯 하나의 아바타. 매 프레임 consumer에 전달, 수신 끊기면 표정 굳힘. `IAvatarLoader`를 같은 오브젝트에서 찾고, `autoLoadAssetKey`가 있으면 Start에서 자동 로드 |
| `PrimitiveAvatarLoader.cs` | VRM 없이 쓰는 프리미티브 마스코트 (`builtin/primitive`): 구 머리·눈·눈썹·입·혀. 토큰 색(Lavender/Night/Ink). `Build(parent)`는 테스트용 |
| `PrimitiveExpressionDriver.cs` | 마스코트 표정: jawOpen→입 세로, smile/frown→입 가로·높이, blink/wide→눈, browInnerUp/browDown→눈썹, cheekPuff→머리 가로, tongueOut→혀. Lost면 중립으로 |
| `BlendShapeDriver.cs` | ARKit 52개 → SkinnedMeshRenderer 블렌드셰이프 (이름 끝부분 매칭, 스무딩) |
| `HeadPoseDriver.cs` | 쿼터니언 → 머리 본 (오른손→왼손 변환, 각도 clamp) |
| `ThemeBackground.cs` | 카메라 배경 = `Tokens.{Light,Dark}.Night` |
| `FrameTimingProbe.cs` | 프레임 시간·수신→렌더 지연 로그 (0단계 성능 측정) |
| `Editor/SceneSetup.cs` | 통화 씬 생성 |
| `Editor/BuildLibrary.cs` | UaaL 내보내기 (Android: IL2CPP arm64+armv7, minSdk 29, gradle 프로젝트 / iOS: Device·Simulator Xcode 프로젝트) |
| `Tests/EditMode/FaceProtocolTests.cs` | 코덱 라운드트립, 매직·버전 거부, 리시버, clamp |

Packages/manifest.json에는 URP와 UniVRM(git)이 들어 있다. 통화 씬은 두 슬롯 모두 `PrimitiveAvatarLoader`로 `builtin/primitive`를 자동 로드한다. VRM 로더(`IAvatarLoader` 구현)와 VRM 1.0 Expression 매핑은 아직 없다.

## 생성물 (직접 수정 금지)

`pnpm sync:generated`가 아래 파일을 복사한다.

- `Assets/Murmur/Generated/Tokens.cs` ← packages/design-tokens/dist/Tokens.cs (`Murmur.Design.Tokens`)
- `Assets/Murmur/Generated/FaceProtocol.cs` ← packages/face-protocol/dist/generated/FaceProtocol.cs (`Murmur.FaceProtocol`, 144바이트 프레임 디코더 포함)

## 규칙

- 표정 입력은 `FaceFrameCodec.Decode`로 받은 프레임만 쓴다. 카메라에 접근하지 않는다.
- 색은 `Murmur.Design.Tokens.Light/Dark`만 쓴다. 통화 화면 배경은 `Night`.
- 블렌드셰이프 이름은 `BlendShape` enum 순서(ARKit 52개)를 따른다. VRM 모델은 로드 시 이 순서로 리타깃한다.
- 성능 예산: 2020년 보급형 Android 기기에서 30fps, 프레임 수신→렌더 지연 1프레임 이내.
