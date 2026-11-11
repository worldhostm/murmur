# 스펙: 지원 기기 게이트

상태: 구현됨 (2026-11-06). 기획 결정: "iOS는 Face ID 기기만, Android는 2020년 이후 출시 기기만" (PLANNING.md 확정된 결정 표).

## 목적

트래킹 품질을 보장할 수 있는 기기에서만 앱이 실행되게 한다. 기준에 못 미치는 기기는 스토어에서 걸러지고, 그래도 설치된 경우 앱 첫 화면에서 차분히 안내하고 멈춘다.

## 판정 기준

| 플랫폼 | 기준 | 판정 방법 |
| --- | --- | --- |
| iOS | Face ID 기기 | `ARFaceTrackingConfiguration.isSupported` (런타임). 시뮬레이터는 false |
| Android | 2020년 이후 출시 | 기기가 **처음 출하된** Android 버전 `ro.product.first_api_level` ≥ 29 (Android 10) |
| Android | 현재 OS | `Build.VERSION.SDK_INT` ≥ 29. `minSdkVersion = 29`로 Play 스토어에서도 걸러진다 |
| Android | 하드웨어 | 전면 카메라(`FEATURE_CAMERA_FRONT`, 매니페스트 `uses-feature required`), 64비트 ABI |

**"2020년 이후 출시"를 first_api_level로 판정하는 근거.** Google의 GMS 인증 요건상 2020년 1월 31일 이후 출시된 기기는 Android 10 이상으로 출하되어야 했다. 따라서 출하 시 API 레벨이 29 이상이면 2020년 이후 출시로 본다. 2019년 이전 기기는 나중에 Android 10으로 업그레이드되어도 `first_api_level`은 출하 당시 값(≤ 28)이라 걸러진다. 모델명 목록을 유지하는 방식보다 정확하고 유지보수가 없다.

`first_api_level`을 읽지 못하는 기기(0)는 OS가 10 이상이면 통과시키되 `reason: 'unknown'`으로 표시한다. 이 비율을 지표로 모아, 많으면 모델 목록 보조 판정을 추가한다.

## 구현 위치

- `apps/mobile/android/.../DeviceSupportModule.kt` (`MurmurDeviceSupport.getInfo`): 사실 수집만. 판정 규칙은 두지 않는다.
- `apps/mobile/src/device/deviceSupport.ts`: `evaluateAndroidSupport`(순수 함수, 테스트 대상), `getDeviceSupport`(플랫폼 분기). 네이티브 모듈이 없으면 개발 빌드는 통과, 배포 빌드는 차단.
- `apps/mobile/src/screens/UnsupportedDeviceScreen.tsx`: 안내 화면. 이유 문구는 `device.reason.*` i18n 키.
- `AppNavigator`: 판정 전에는 아무것도 그리지 않고, 미지원이면 안내 화면만 그린다.
- `android/build.gradle`: `minSdkVersion = 29`.

## 스토어 설정 (출시 전 체크리스트)

- [ ] Play Console → 기기 카탈로그에서 RAM 3GB 미만, 32비트 전용 기기 제외
- [ ] App Store Connect: `UIRequiredDeviceCapabilities`에 `arkit` 추가 여부 결정 (추가하면 Face ID 없는 iPhone SE 계열이 스토어에서 제외된다. 런타임 판정과 중복이지만 스토어 노출을 줄여 준다)

## 0단계 PoC 기준 기기 (참고 목록)

판정은 위 규칙으로 하고, 아래는 테스트 구매·대여용 참고다. 모두 2020년 출시, Android 10 출하, 보급형이다.

| 기기 | 출시 | AP | RAM |
| --- | --- | --- | --- |
| Galaxy A21s (SM-A217) | 2020-06 | Exynos 850 | 3~4GB |
| Galaxy A31 (SM-A315) | 2020-04 | Helio P65 | 4GB |
| Galaxy A12 (SM-A125) | 2020-11 | Helio P35 | 3~4GB |
| Redmi 9 | 2020-06 | Helio G80 | 3~4GB |
| Redmi Note 9 | 2020-04 | Helio G85 | 3~4GB |

가장 느린 축(A12, Helio P35)에서 30fps 트래킹이 나오면 기준을 통과한 것으로 본다. 결과는 `docs/REMAINING_WORK.md` #5의 절차대로 기록한다.

## 완료 조건

- [x] `evaluateAndroidSupport` 단위 테스트: 2020년 기기 통과, 2018년 기기(업그레이드됨) 차단, OS 구버전 차단, 전면 카메라·64비트 없음 차단, first_api_level 미상 → unknown 통과
- [x] 미지원 기기에서 안내 화면만 그려지고 온보딩이 그려지지 않는다 (내비게이터 테스트)
- [x] `minSdkVersion 29`로 Android 빌드 통과
- [ ] 실기기 2종(2018년 이전 1종, 2020년 1종)에서 판정 확인

## 2026-11-11 텍스트 모드 예외

위의 기기 차단은 트래킹 기능에 적용한다. 미지원 안내와 온보딩의 텍스트 대화 버튼을 통해 캐릭터 선택·솔로 대화·기분 기록을 사용할 수 있다. 텍스트 모드에서는 트래커와 Unity를 만들지 않는다. Android 전면 카메라 필수 설치 조건을 제거했으며 minSdk 29와 ABI 조건은 유지한다. 구체적인 변경은 `solo-conversation-reliability.md` 참고.
