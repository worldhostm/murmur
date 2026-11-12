# apps/avatar-unity

Unity(URP) 아바타 렌더러. 앱(React Native)에 라이브러리(Unity as a Library)로 임베드된다. 통화 화면의 아바타와 배경만 그린다. 텍스트 UI는 그리지 않는다.

## 상태

Unity 6 (6000.0.84f1) 프로젝트 뼈대. Unity Hub에서 이 폴더를 열면 Library/ProjectSettings가 생성된다. 씬은 메뉴 `Murmur/Create Call Scene`(또는 `-executeMethod Murmur.Editor.SceneSetup.CreateCallScene`)으로 만든다.
배치 모드: `pnpm unity:test`(EditMode), `pnpm unity:export:android`/`ios`/`ios-simulator`(Unity as a Library 내보내기, `Editor/BuildLibrary.cs`), `pnpm unity:framework:ios`(Device+Simulator 를 `Builds/ios/UnityFramework.xcframework` 로 합치고 `Data` 를 프레임워크 안에 복사, `MurmurUnity.podspec` 생성). 라이선스 없이 컴파일만 보려면 `pnpm unity:compile-check` (에디터 조건 + Android 플레이어 조건 두 번 컴파일).

## 스크립트 (Assets/Murmur/Scripts)

| 파일 | 역할 |
| --- | --- |
| `MurmurBridge.cs` | 네이티브가 `UnitySendMessage("MurmurBridge", …)`로 부르는 진입점. `OnFaceFrame("slot|base64")`, `LoadAvatar("slot|assetKey")`, `SetTheme("light"/"dark")`. `Start()`에서 Android `UnityPlayerProxy.onUnityReady()`를 불러 네이티브가 큐에 쌓아 둔 메시지를 흘려보내게 한다 (`com.unity.modules.androidjni` 필요) |
| `FaceFrameReceiver.cs` | 슬롯별 최신 프레임 보관 (네이티브 스레드 → 메인 스레드, lock) |
| `AvatarSlotController.cs` | 슬롯 하나의 아바타. 매 프레임 consumer에 전달, 수신 끊기면 표정 굳힘. `IAvatarLoader`를 같은 오브젝트에서 찾고, `autoLoadAssetKey`가 있으면 Start에서 자동 로드 |
| `PrimitiveAvatarLoader.cs` | VRM 없이 쓰는 프리미티브 마스코트 (`builtin/primitive`): 구 머리·눈·눈썹·입·혀. 토큰 색(Lavender/Night/Ink). 내장 메시(`Resources.GetBuiltinResource`)로 만든다 — `CreatePrimitive` 는 플레이어 빌드에서 Collider 가 스트리핑되어 오류. 머티리얼은 `Resources/Murmur/PrimitiveLit` 복제. `Build(parent)`는 테스트용 |
| `SpriteSheetAvatarLoader.cs` | 에셋 키 `characters/<id>/front` → `Resources/Characters/<id>` 아틀라스(137×240 셀 5×2, MVP 4인은 `scripts/slice-expression-sheet.py`. 로스터 10인은 출시 예정이라 아틀라스가 없고, 출시 시 `scripts/slice-character-expressions.py` 로 만든다)를 입힌 쿼드. 실사형 렌더 전 PoC (docs/specs/character-sprite-avatar.md, character-roster.md) |
| `SpriteExpression.cs` | 시트 10칸 enum + `SpriteExpressionClassifier`(블렌드셰이프 → 칸, 우선순위 규칙) |
| `SpriteExpressionDriver.cs` | 스무딩 → 분류 → UV offset 전환(최소 유지 150ms), 머리 roll 기울기·평행이동 |
| `IdleMotion.cs` | 스프라이트 루트의 숨쉬기·bob·roll 흔들림 (피벗은 표정 드라이버 몫). `MotionSettings.Reduced` 면 정지 자세 |
| `AmbientBackground.cs` | 아바타 뒤 빛 덩어리 3개(런타임 방사형 텍스처, `Resources/Murmur/GlowUnlit`)가 느리게 떠다닌다. 테마별 토큰 색. `ThemeBackground` 가 런타임에 붙인다 |
| `MotionSettings.cs` | OS "동작 줄이기" 플래그. `MurmurBridge.SetMotion("reduced"|"full")` |
| `PrimitiveExpressionDriver.cs` | 마스코트 표정: jawOpen→입 세로, smile/frown→입 가로·높이, blink/wide→눈, browInnerUp/browDown→눈썹, cheekPuff→머리 가로, tongueOut→혀. Lost면 중립으로 |
| `BlendShapeDriver.cs` | ARKit 52개 → SkinnedMeshRenderer 블렌드셰이프 (이름 끝부분 매칭, 스무딩) |
| `HeadPoseDriver.cs` | 쿼터니언 → 머리 본 (오른손→왼손 변환, 각도 clamp) |
| `ThemeBackground.cs` | 카메라 배경 = `Tokens.{Light,Dark}.Night` |
| `FrameTimingProbe.cs` | 프레임 시간·수신→렌더 지연 로그 (0단계 성능 측정) |
| `Editor/SceneSetup.cs` | 통화 씬 생성. `EnsureRenderPipeline()`(URP 에셋 `Settings/MurmurURP.asset` 생성·Graphics/Quality 지정, 없으면 빌트인으로 떨어져 마젠타), `EnsurePrimitiveMaterial()`(`Resources/Murmur/PrimitiveLit.mat`, 플레이어 빌드에 URP Lit 셰이더를 포함시키는 용도) |
| `Editor/BuildLibrary.cs` | UaaL 내보내기 (Android: IL2CPP arm64+armv7, minSdk 29, 전체화면(immersive) 끔, gradle 프로젝트 / iOS: Device·Simulator Xcode 프로젝트). 빌드 전에 URP 에셋·머티리얼을 보장한다 |
| `Tests/EditMode/FaceProtocolTests.cs` | 코덱 라운드트립, 매직·버전 거부, 리시버, clamp |

Packages/manifest.json에는 URP와 UniVRM(git)이 들어 있다. 통화 씬의 두 슬롯에는 `PrimitiveAvatarLoader`(`builtin/primitive`, 자동 로드)와 `SpriteSheetAvatarLoader`(`characters/<id>/front`)가 붙어 있고, `AvatarSlotController.Load` 가 `IAvatarLoader.CanLoad` 로 키에 맞는 로더를 고른다. VRM 로더와 VRM 1.0 Expression 매핑은 아직 없다.

## 생성물 (직접 수정 금지)

`pnpm sync:generated`가 아래 파일을 복사한다.

- `Assets/Murmur/Generated/Tokens.cs` ← packages/design-tokens/dist/Tokens.cs (`Murmur.Design.Tokens`)
- `Assets/Murmur/Generated/FaceProtocol.cs` ← packages/face-protocol/dist/generated/FaceProtocol.cs (`Murmur.FaceProtocol`, 144바이트 프레임 디코더 포함)

## 규칙

- 런타임에서 `Shader.Find` 로만 쓰는 셰이더는 빌드에 안 들어간다. 머티리얼 에셋을 `Resources/` 에 두고 복제한다.
- `GameObject.CreatePrimitive` 를 쓰지 않는다 (Physics 모듈 스트리핑). 내장 메시 `Sphere.fbx` 는 반지름 1 이므로 `PrimitiveAvatarLoader.BuiltinMesh` 의 정규화 복사본을 거친다.

- 표정 입력은 `FaceFrameCodec.Decode`로 받은 프레임만 쓴다. 카메라에 접근하지 않는다.
- 색은 `Murmur.Design.Tokens.Light/Dark`만 쓴다. 통화 화면 배경은 `Night`.
- 블렌드셰이프 이름은 `BlendShape` enum 순서(ARKit 52개)를 따른다. VRM 모델은 로드 시 이 순서로 리타깃한다.
- 성능 예산: 2020년 보급형 Android 기기에서 30fps, 프레임 수신→렌더 지연 1프레임 이내.
