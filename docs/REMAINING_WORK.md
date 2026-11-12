# 진행하지 못한 작업 (0단계 PoC 기준)

작성: 2026-11-06 (같은 날 갱신). "다음 단계"로 잡았던 항목 중 이 머신·이 세션에서 끝내지 못한 것을 모아 둔다. 각 항목에 **막힌 이유**, **지금까지 해 둔 것**, **이어서 할 일**을 적는다. 끝나면 항목을 지우고 `docs/specs/`의 완료 조건에 체크한다.

## 요약표

| # | 항목 | 상태 | 막힌 이유 |
| --- | --- | --- | --- |
| 1 | iOS 네이티브 빌드 (ARKit 트래커, Unity 브리지) | **빌드 완료**. 시뮬레이터 실행 확인(게이트 화면). 실기기 ARKit 트래킹·Unity 표시 **미확인** | 테스트용 iPhone 없음 (테스트 폰은 Android 1대뿐) |
| 2 | Unity 에디터에서 프로젝트 열기·패키지 해석·Test Runner | **완료** (EditMode 10개 통과, `pnpm unity:test`) | — |
| 3 | Unity as a Library 연결 (Android/iOS) | **Android 연결 완료**(APK 빌드, 에뮬레이터에서 UnityPlayer 생성 확인). iOS 는 프레임워크 포함 빌드까지 완료 | 실기기 확인 없음 (아래 5~6) |
| 4 | 캐릭터 렌더 | **PoC 완료**: 표정 시트 10칸을 표정 수치로 골라 보여주는 2D 스프라이트(`docs/specs/character-sprite-avatar.md`). 기획의 최종 방식(실사형 신경망 구동)과 VRM 로더는 미착수 | 실사형은 서버 GPU·외주 원화 필요. 현재 아틀라스는 AI 생성 시안 |
| 5 | 2020년 보급형 Android 기기 트래킹 품질·지연 측정 | 측정 코드(FrameTimingProbe, `[perf]` 로그) 작성됨 | **폰을 지금 연결할 수 없음** (2026-11-06 기준). 절차는 아래 5~6 에 정리 |
| 6 | Android 앱 실기기 실행 | 에뮬레이터(Pixel 8, API 36, swiftshader) 에서 게이트 통과 → 통화 화면 진입 → Unity 아바타 표시·트래커 CPU 폴백까지 확인. 드러난 문제 8건 수정 (3번 항목) | 실기기 미연결 |
| 7 | react-navigation 교체 | 임시 내비게이터 사용 중 | 우선순위상 뒤로 미룸 |
| 8 | Noto 글꼴 번들 | README만 | 글꼴 파일(수 MB)을 저장소에 넣을지 결정 필요 |
| 9 | 카메라 권한 요청 UI | Android 는 통화 화면 진입 시 `PermissionsAndroid` 런타임 요청, iOS 는 시스템 프롬프트. 거부 시 `permission-denied` 상태만 표시 | 온보딩 안에 설명 화면을 넣을지 설계 필요 |

## 1. iOS — 실기기 검증만 남음

- Xcode 27.2 + CocoaPods 1.17. RN 0.76.9 의 fmt 11.0.2 가 clang 21 에서 깨져 `pnpm patch` 로 11.2.0 으로 올렸다. iOS 27 SDK 의 UIScene 요구에 맞춰 `SceneDelegate` 채택. 번들 ID `com.murmur`.
- 시뮬레이터(iPhone, iOS 27.2) 실행 확인: Face ID 가 없어 "이 기기에서는 아직 쓸 수 없어요" 안내(의도된 동작).
- Unity 포함 시뮬레이터 실행은 **불가**: Unity 6 의 시뮬레이터 슬라이스가 x86_64 뿐이라 Apple Silicon 의 iOS 27 시뮬레이터가 설치를 거부한다. 시뮬레이터 작업은 `MURMUR_NO_UNITY=1 pod install`.
- **이어서 할 일 (iPhone 이 생기면)**: Face ID 기기에 `pod install`(기본) → Xcode 실행. 확인 지점 (a) `[MurmurUnity] UnityFramework running` 로그와 통화 화면에 Unity 뷰 표시, (b) `MurmurFaceTracker.start()` → `murmur.faceFrame` 30Hz, (c) `setExecuteHeader:` 에 넘기는 `_dyld_get_image_header(0)` 이 메인 실행 파일인지, (d) iOS 쪽에도 Android 와 같은 "Unity 준비됨" 콜백(아래 3번)을 넣어 `LoadAvatar` 가 버려지지 않는지.

## 2. Unity 에디터 — 완료

Hub 로그인 후 배치 모드 동작. UniVRM 0.128.3 은 `com.unity.timeline` 을 요구한다. `Assets/Murmur/Scenes/Call.unity` 생성, EditMode 10개 통과.

## 3. Unity as a Library — Android 연결 완료, 에뮬레이터에서 아바타 표시 확인

- **해 둔 것**: `pnpm unity:export:android` → `apps/avatar-unity/Builds/android/unityLibrary`. `settings.gradle` 이 내보내기 결과가 있을 때만 `:unityLibrary` 를 include 하고, `app/src/unity` 소스셋(`UnityHost`, `UnityViewManager`)을 켠다. RN `UnityView` 가 통화 화면의 아바타 자리에 `UnityPlayerForActivityOrService` 의 FrameLayout 을 올린다. 트래커 → `UnityPlayerProxy` → `UnitySendMessage("MurmurBridge", ...)`.
- **에뮬레이터(Pixel 8 API 36, swiftshader) 점검에서 발견해 고친 것 (2026-11-06)**
  1. Unity 네이티브 라이브러리 로드 전에 보낸 `LoadAvatar` 가 버려짐 → `UnityPlayerProxy` 가 `LoadAvatar`/`SetTheme` 를 큐(최대 32개)에 담고, `MurmurBridge.Start()` 가 `UnityPlayerProxy.onUnityReady()` 를 호출하면 흘려보낸다 (`com.unity.modules.androidjni` 모듈 필요). 로그 `Unity ready, flushing 2 queued messages` 확인.
  2. 액티비티가 이미 resumed 인 상태에서 UnityPlayer 를 늦게 만들면 메인 루프가 돌지 않음 → 생성 직후 `resume()`.
  3. Unity immersive 전체화면 전환으로 시스템 안내가 RN 오버레이를 가림 → `startInFullscreen = false`.
  4. `GameObject.CreatePrimitive` 가 플레이어 빌드에서 "class 'SphereCollider' doesn't exist" → 내장 메시 + MeshRenderer 로 교체.
  5. URP 파이프라인 에셋이 지정되지 않아 빌트인 파이프라인으로 빌드되어 URP Lit 머티리얼이 마젠타 → `SceneSetup.EnsureRenderPipeline()` 이 `Settings/MurmurURP.asset` 을 만들어 Graphics/Quality 에 지정, 머티리얼은 `Resources/Murmur/PrimitiveLit.mat` 로 빌드에 포함.
  6. 비활성으로 시작하는 local 슬롯은 Awake 가 돌지 않아 `IAvatarLoader` 를 못 찾음 → `Load()` 에서 지연 조회.
  7. 눈·입·눈썹이 0.3 배 스케일된 머리 구의 자식이라 구 안에 숨음 → 머리 피벗(스케일 1)과 구 메시를 분리.
  8. 내장 메시 `Sphere.fbx` 는 반지름 1(CreatePrimitive 구의 두 배)이라 머리가 화면을 채우고 눈·입이 묻힘 → 내장 메시를 반지름 0.5 로 정규화한 복사본 사용. 로드 시 `[PrimitiveAvatar]` 로그로 카메라·머리·눈 배치를 남긴다.
  9. (2026-11-09) 캐릭터 표정 시트 아바타(`SpriteSheetAvatarLoader`)가 로드 로그만 찍히고 화면엔 배경색만 보임 → 내장 Quad 의 정면이 -Z 인데 카메라가 +Z 쪽에서 봐서 뒷면 컬링. 쿼드 Z 스케일을 -1 로 뒤집어 법선만 돌림(좌우 반전 없음). EditMode 테스트 `QuadFacesTheCallCameraWithoutMirroring` 추가.
  10. (2026-11-09) AVD 기본 설정(`hw.camera.front=none`)이면 트래커가 "camera bind failed" 로 시작하지 못한다 → 에뮬레이터를 `emulator -avd Pixel_8_API36 -gpu swiftshader_indirect -camera-front emulated` 로 띄운다.
- **에뮬레이터 결과**: 통화 화면에 Lavender 머리와 눈·눈썹·입이 Night 배경 위에 그려지고 RN 오버레이가 위에 보인다. Unity `[perf]` 프레임 평균 33~46ms(swiftshader), 수신→렌더 0.0~0.2ms, drop 0. 에뮬레이터 카메라에는 얼굴이 없어 트래킹 라벨은 "얼굴이 보이지 않아요" 로 멈춘다. 표정 반응은 실기기에서만 확인할 수 있다.
- **남은 것**: iOS 에 같은 준비 콜백(`MurmurBridge.NotifyNativeReady` 의 iOS 분기 + `MurmurUnityBridge.swift` 큐)과 `resume` 에 해당하는 처리. 카메라 소유권은 현재 구조(네이티브 트래커가 카메라를 쥐고 Unity 는 프레임만 받음)로 확정.

## 4. 캐릭터 렌더

- **해 둔 것 (2026-11-06)**: `SpriteSheetAvatarLoader` + `SpriteExpressionDriver`. 캐릭터 선택 → 통화 화면에서 `characters/<id>/front` 키로 해당 캐릭터 아틀라스를 로드하고, 블렌드셰이프를 10칸(기본·미소 2단계·활짝 웃음·진지·놀람·당황·걱정·슬픔·화남)으로 분류해 보여준다. 아틀라스는 `scripts/slice-expression-sheet.py` 로 시트에서 자른다.
- **이어서 할 일**: (a) 외주 납품본(2048px 정면 + 표정 시트)으로 아틀라스 교체, 셀 해상도 상향. (b) 립싱크(아·이·우·에·오 칸)와 눈 깜빡임 칸 추가 시 분류기 확장. (c) 기획의 실사형 렌더(LivePortrait 계열 서버 렌더 → 온디바이스)로 교체. (d) 실기기에서 표정 전환 확인.

### VRM 로더 (3D 스타일라이즈드·마스코트용)

- **해 둔 것**: `AvatarSlotController` 가 `IAvatarLoader` 를 찾아 `Load(assetKey)`. 기본 키 `builtin/primitive` 는 `PrimitiveAvatarLoader` 가 캡슐 + `PrimitiveExpressionDriver` 로 처리한다. `BlendShapeDriver` 는 메시 블렌드셰이프 이름 끝부분으로 ARKit 이름을 자동 매칭.
- **이어서 할 일**: UniVRM 의 `Vrm10Instance` 로 로드하고 ARKit 52개 → VRM 1.0 Expression 매핑 테이블을 `VrmExpressionDriver.cs` 로 추가. 마스코트(사람 얼굴이 아닌 모델)는 별도 리타깃 테이블 필요 (PLANNING.md 표).

## 5~6. Android 실기기 측정 — 폰을 연결하면 바로 할 일

2026-11-06 기준 테스트 폰(Android 1대)을 연결할 수 없어 아래 절차만 남긴다. APK 는 `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (Unity 포함, 약 330MB, arm64-v8a).

### 준비

1. 폰: 설정 → 개발자 옵션 → USB 디버깅 켜기. 2020년 이후 출시 모델이어야 게이트를 통과한다 (`ro.product.first_api_level ≥ 29`, 즉 Android 10 으로 출시). 확인: `adb shell getprop ro.product.first_api_level`.
2. Mac: `export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools`, `adb devices` 에 `device` 로 보이는지(처음엔 폰에서 RSA 승인).
3. 기기 정보 기록: `adb shell getprop` 의 `ro.product.manufacturer`, `ro.product.model`, `ro.build.version.sdk`, `ro.product.first_api_level`, `ro.product.cpu.abilist`.

### 설치·실행

```sh
pnpm android:build                                   # APK 재빌드 (Unity 내보내기가 바뀌었으면 pnpm unity:export:android 먼저)
adb install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb reverse tcp:8081 tcp:8081 && pnpm --filter @murmur/mobile start   # Metro
adb shell am start -n com.murmur/.MainActivity
```

온보딩 → 캐릭터 선택 → "랜덤 매칭" 으로 통화 화면 진입. 카메라 권한 프롬프트에서 허용. 에뮬레이터 자동화에 쓴 `uiautomator dump` + `input tap` 방식은 실기기에서도 같다.

솔로 채팅의 실제 LLM 답은 Mac 에서 `pnpm --filter @murmur/ai-character dev` 를 띄운 뒤, 실기기에서는 `apps/mobile/src/config.ts` 의 `AI_CHARACTER_URL` 을 Mac 의 LAN IP(`http://192.168.x.x:8787`)로 바꿔야 닿는다 (에뮬레이터는 `10.0.2.2` 로 자동).

### 확인 항목과 로그

```sh
adb logcat -s MurmurFaceTracker MurmurUnity Unity ReactNativeJS
```

| 항목 | 기준 | 어디서 읽나 |
| --- | --- | --- |
| 게이트 | 통화 화면 진입 (미지원 화면이 뜨면 `first_api_level` 확인) | 화면 |
| 트래커 delegate | `GPU` 가 기본. 생성 실패 또는 결과 없이 30프레임이 지나면 `falling back to CPU` 후 `delegate=CPU` (에뮬레이터는 항상 CPU 로 떨어진다. 실기기에서 GPU 가 유지되는지가 측정 포인트) | `MurmurFaceTracker` |
| 트래킹 상태 | 상단 이름표 옆 라벨이 "표정 추적 중" | 화면 / `murmur.trackingState` |
| 프레임 주기 | 30Hz 목표 (RN 디버그 오버레이의 fps 값) | 화면 |
| Unity 준비 | `Unity ready, flushing N queued messages` 후 캡슐 아바타가 보이고 입 벌림에 반응 | `MurmurUnity` / 화면 |
| 렌더 지연 | `[perf]` 로그의 프레임 시간, 수신→렌더 지연 33ms 이내 | `Unity` 태그 (FrameTimingProbe) |
| 입→반응 지연 | 화면 녹화(`adb shell screenrecord`)로 입 벌린 시점과 `jawOpen` 상승 사이 측정 | 녹화 |
| 발열·점유 | `adb shell dumpsys cpuinfo`, 10분 통화 후 프레임 유지 여부 | 셸 |

결과는 `docs/specs/phase0-poc.md`(새로 작성)에 기기명·delegate·fps·지연을 적고 기준 기기를 확정한다. GPU delegate 가 깨지는 기기가 있으면 CPU 폴백이 자동으로 걸리지만, CPU 로도 30Hz 가 안 나오면 `deviceSupport.ts` 에 모델 예외를 둔다. MediaPipe tasks 0.10.14 는 `setErrorListener` 를 TaskRunner 에 전달하지 않아 추론 오류는 로그(`TaskRunner: Mediapipe error`)로만 나온다.

## 7~9. 앱 쪽 나머지

- react-navigation: `apps/mobile/src/navigation/AppNavigator.tsx` 의 `Route` 를 그대로 스택 라우트로 옮기면 된다. 화면 컴포넌트는 props 만 받으므로 수정이 없다.
- 글꼴: `apps/mobile/assets/fonts/README.md` 의 파일 5개를 넣고 `npx react-native-asset`. 저장소 용량이 부담이면 Git LFS.
- 카메라 권한: 지금은 통화 화면 진입 시 바로 요청한다. 온보딩 두 번째 단계로 "표정만 전송돼요" 설명과 함께 요청하는 안을 권한다. 거부 시 솔로 모드는 텍스트로만 진행 가능해야 한다.

## 2026-11-11 기획 점검과 솔로 대화 개선

- 개선 우선순위·범위·완료 조건: [솔로 대화 신뢰성 개선](specs/solo-conversation-reliability.md).
- 구현: 응답 대기 중 중복 전송 방지, 초안 유지, 최종 실패 안내, 화면 이탈 후 늦은 응답 무효화, 같은 캐릭터 재입장 시 새 원격 세션 생성.
- 후속: 기분 기록 저장·조회(현재 콜백 비어 있음), 친구 통화/랜덤 매칭 분리 및 실제 시그널링 연결, 카메라 없이 텍스트 모드 진입.
- 실제 서버·실기기 검증은 별도 필요. 이번 검증은 가짜 응답을 사용하는 모바일 회귀 테스트와 정적 검사 기준.

### 후속 구현 반영 (2026-11-11)

- 기분 기록 저장·날짜별 조회·삭제, 친구 초대/랜덤 매칭 입구 분리, HTTP 시그널링 연결, 텍스트 전용 진입, iOS Unity 준비 알림과 메시지 큐를 구현했다. 위 과거 항목의 "미구현" 설명보다 이 절과 최신 스펙을 우선한다.
- 친구 연결은 상대 입장 확인까지만 가능하다. 음성/표정 미디어 엔진, 계정·성인 인증, 영속 신고·차단 저장은 남아 있다. 실제 음소거가 없는 버튼은 연결 흐름에서 제거했다.
- 이제 트래킹 PoC는 개발 빌드에서 솔로 → 친구 연결 → "내 표정 미리보기"로 진입한다. 초대방을 실제 통화로 표시하지 않는다.
- ADB 소켓 접근 및 Gradle 사용자 캐시 쓰기가 실행 환경에서 거부돼 APK 재빌드·실기기 측정은 미완료다. iOS/Android 기분 저장 후 앱 재시작, Unity 재내보내기 후 iOS 준비 큐 전달, 실제 fps/지연을 기기 연결 후 확인해야 한다.

## 디자인 개선 백로그 (2026-11-11)

상세: [폰트·가독성·화면 구조 개선안](specs/design-readability-layout.md). 현재는 기획 작성 상태다.

- P0: Noto 파일 5종 번들·실제 굵기 매핑 검증, 본문/필수 안내 타입 스케일 정리, 키보드 위 입력창과 공통 입력 컴포넌트.
- P1: 아바타 크기 적응형 처리, 대화 스크롤 위치 유지, 기분 작성/기록 조회 분리, 캐릭터 목록과 초대 화면의 행동 위계 정리.
- P2: 넓은 화면 최대 콘텐츠 폭, 큰 글자·두 테마·스크린리더를 포함한 화면 검수.
- 문서의 글자 크기·폭·높이 값은 제안이며 아직 토큰에 적용하지 않았다. 실기기 시각 검증과 디자인 구현은 후속 작업이다.

### 디자인 1차 구현 반영

본문·설명 타입 스케일, 공통 입력 필드, 고정 채팅 입력창·별도 기록 화면, 아바타 축소, 캐릭터/초대 화면 배치를 적용했다. 상세 완료/보류 범위는 디자인 개선안 §10을 따른다. Noto 번들과 실기기 시각 검수는 다음 작은 작업 단위로 남긴다.

### 폰트 준비 재개 (2026-11-12)

- 완료: 미등록 폰트명 대신 명시적 시스템 대체, 정적 TTF 굵기/PostScript 이름·Android 복사본·iOS 등록 목록·OFL 파일 검사 및 CI 연결.
- 미완료: 실제 Noto TTF/OFL 확보, Android/iOS 등록, 재빌드·실기기 확인. 현재 DNS 제한으로 원본 다운로드가 실패했다. `fonts:check --require-bundled`는 이 미완료 상태를 실패로 보고한다.
- 안내: `apps/mobile/assets/fonts/README.md`. 다음 작업은 이 폰트 번들 한 단위로 진행한다.

### 전 페이지 경험 개편 및 Android 실행 (2026-11-12)

- 적용: 온보딩 캐릭터 히어로, 큰 선택 초상, 채팅 입력 도크/연속 메시지 그룹화, 접힌 개발 예시, 기록 노트/세그먼트, 초대 상태 카드/보조 메뉴, 미지원 대안/미리보기/통화 컨트롤 정리.
- 기획: `docs/specs/design-character-experience.md`. 실행 절차: `docs/specs/android-preview.md`.
- JS 번들 생성과 Metro 없는 APK 옵션 `pnpm android:build:preview`를 검증했다(번들 포함 APK 가 에뮬레이터에서 온보딩까지 뜸). 일반 debug APK는 Metro가 필요하다.
- 사용자 환경에서 새 APK 설치 또는 Metro 연결 후 전 페이지 실제 화면(390/320 폭, 키보드, 큰 글자, 두 테마)을 확인해야 한다.

## 캐릭터 로스터 확장 (2026-11-12)

- 적용: 신규 10인 추가(14인), 컨셉 4종 분류와 선택 화면 섹션, 페르소나·설정 문서·스크립트 답·초상·Unity 아틀라스. 기획: `docs/specs/character-roster.md`.
- 미완료: 신규 10인 아틀라스는 로스터 시트의 저해상도 셀을 키운 레터박스 PoC 자산이다. 외주 원화(기존 4인처럼 시트 전체 폭 시안)로 교체해야 한다. 새 캐릭터 TTS 음성 id 는 자리표시자. 에뮬레이터에서 14인 선택 화면과 신규 아바타 표정 전환을 눈으로 확인해야 한다.

