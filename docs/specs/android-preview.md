# Android 실행 및 UI 미리보기

2026-11-12

## "Unable to load script" 진단

이 메시지는 앱 실행 시 JavaScript를 받지 못했음을 뜻한다. 네이티브 APK 빌드가 실패했다는 뜻은 아니다.

- 현재 일반 debug APK는 Metro 개발 서버에서 JavaScript를 받아 실행한다. APK에 `assets/index.android.bundle`이 없는 것은 이 모드에서 정상이다.
- Metro 미실행, 에뮬레이터→Metro 연결 실패, 잘못된 개발 서버 주소가 있으면 이 오류가 날 수 있다.
- release/독립 실행 APK에서 같은 메시지가 나면 번들 생성·패키징 설정을 확인해야 한다.
- 이번 확인: 2026-11-12 10:44 생성된 debug APK에 JS 번들이 없었다. 현재 도구 환경에서 8081 연결이 실패했고 Metro 시작은 `listen EPERM`, ADB 시작은 소켓 바인딩 권한 오류가 났다. 따라서 사용자의 데스크톱 전체에서 Metro가 꺼져 있다고 단정하지 않는다.
- 일반 CLI 번들 실행 중 `EMFILE: too many open files, watch`도 관찰했다. Metro 감시 범위를 저장소 전체에서 packages/node_modules로 줄이고 모바일 android/ios 디렉터리를 제외했다. 실제 Metro 서버 동작은 허용된 로컬 터미널에서 확인해야 한다.

## 1. 개발 모드 (빠른 UI 수정 확인)

저장소 루트의 첫 번째 터미널:

```sh
pnpm --filter @murmur/mobile start
```

두 번째 터미널:

```sh
adb devices
adb -s emulator-5554 reverse tcp:8081 tcp:8081
```

이후 앱의 RELOAD를 누른다. 장치 ID는 `adb devices` 결과에 맞춘다. 서버를 확인하려면 `curl http://127.0.0.1:8081/status`의 `packager-status:running`을 본다. 연결에 문제가 있으면 개발 메뉴의 서버 주소가 오래된 LAN IP로 지정되어 있는지도 확인한다.

네이티브 설정을 바꾼 경우 `pnpm android:build` 후 APK를 다시 설치한다. JS 변경만이면 Metro 연결 후 새 내용이 반영된다.

## 2. Metro 없는 UI 미리보기

```sh
pnpm android:build:preview
unzip -l apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk assets/index.android.bundle
adb -s emulator-5554 install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb -s emulator-5554 shell am force-stop com.murmur
adb -s emulator-5554 shell am start -n com.murmur/.MainActivity
```

- `-PmurmurOffline=true`가 RN Gradle의 debug 예외를 해제해 JS/이미지를 패키징하고, `MURMUR_OFFLINE_BUNDLE`로 Metro 개발 지원을 끈다.
- 앱의 서명·패키지 ID는 debug와 같다. 기존 설치를 업데이트하며 저장 데이터 삭제는 요구하지 않는다.
- 이 모드는 UI 미리보기이며 Fast Refresh/개발 메뉴가 없다. JS를 바꾸면 다시 빌드해야 한다.
- 번들은 `dev=false`다. 현재 `config.ts`의 서버 주소는 개발 모드에서만 주입되므로 이 빌드에서는 AI 서버/시그널링 주소가 기본으로 비어 있다. 솔로는 스크립트 응답, 친구 연결은 서비스 미설정 안내를 보인다. 서버가 포함된 완성 배포 빌드라는 뜻이 아니다.
- `pnpm android:build`로 다시 빌드하면 일반 Metro 개발 모드로 돌아간다. 두 명령의 APK 출력 경로는 같으므로 마지막 빌드 종류를 구분한다.

## 검증 결과와 제한

- `pnpm mobile:bundle:check`는 실제 RN 진입점으로 Android production JS 번들을 만든다. Metro의 비감시 빌드 API를 사용해 서버/파일 감시 없이 검증한다. 출력은 시스템 임시 폴더의 `murmur-bundle-check/index.android.js`다. 이는 APK나 독립 이미지 패키지가 아니다.
- JS 번들 생성 통과. 변경된 UI의 타입·동작·두 테마 스냅샷을 별도로 검증했다.
- 2026-11-12 확인: `pnpm android:build:preview`가 `assets/index.android.bundle`(약 1MB)을 포함한 APK를 만들고, 에뮬레이터(Pixel_8_API36)에 설치해 Metro 없이 온보딩 화면까지 뜨는 것을 확인했다. 모노레포에서는 hermesc 도 루트 `node_modules`에 있으므로 `build.gradle`의 react 블록에 `hermesCommand`를 명시했다(없으면 "Couldn't determine Hermesc location"으로 번들 태스크가 실패한다).
