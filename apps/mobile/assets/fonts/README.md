# 글꼴

DESIGN_SYSTEM.md §4: Noto Serif KR(display), Noto Sans KR(sans)을 OFL 라이선스로 번들한다.

여기에 아래 파일을 넣고 `npx react-native-asset`(또는 네이티브 프로젝트 생성 시 자동 링크)으로 연결한다.

- `NotoSansKR-Regular.ttf` (400), `NotoSansKR-Medium.ttf` (500), `NotoSansKR-SemiBold.ttf` (600), `NotoSansKR-Bold.ttf` (700)
- `NotoSerifKR-SemiBold.ttf` (600)

출처: https://fonts.google.com/noto/specimen/Noto+Sans+KR , https://fonts.google.com/noto/specimen/Noto+Serif+KR (SIL Open Font License 1.1)

토큰의 `fontFamily`는 패밀리 이름("Noto Sans KR")이다. Android에서 파일명 기반으로 매칭되도록 `src/theme/fontFamily.ts`가 굵기별 파일명으로 바꿔 준다.

## 현재 상태 (2026-11-12)

글꼴 바이너리와 OFL 파일은 아직 없다. 다운로드 시 `raw.githubusercontent.com` DNS 해석이 실패했다. `manifest.json`의 `enabled: false`가 이 상태를 명시하며 앱은 iOS `System`, Android `sans-serif`를 쓴다. Display도 임시로 시스템 Sans를 사용한다. 글자 크기·줄높이·굵기 토큰은 유지한다.

## 작은 단위의 다음 작업

1. 출처와 배포 버전을 확인한 정적 TTF 5개와 각각의 실제 OFL 원문을 이 폴더에 넣는다. 라이선스 파일명은 `OFL-NotoSansKR.txt`, `OFL-NotoSerifKR.txt`다. 변수 폰트는 현재 정적 매핑에서 받지 않는다.
2. Android `app/src/main/assets/fonts`에 동일 파일을 연결한다. iOS 앱 타깃의 Copy Bundle Resources와 Info.plist의 UIAppFonts에 파일을 등록한다. 이 등록 작업은 아직 수행하지 않았다.
3. 실제 PostScript 이름을 `manifest.json`과 대조한다. 파일명을 바꾼다고 폰트 내부 이름이 바뀌지는 않는다. `enabled`를 true로 바꾼 다음 `pnpm fonts:check --require-bundled`로 검사한다. 실패하면 활성화 상태로 배포하지 않는다.
4. 앱을 다시 빌드해 한국어/영어/숫자 혼합, Sans 네 굵기, Serif 600을 실제 화면에서 확인한다. CI 통과는 기기에서 렌더링됐다는 뜻이 아니다.

## 검증 명령

- `pnpm fonts:check`: 명시적인 시스템 대체 상태 또는 활성화된 Noto의 파일·메타데이터·네이티브 등록 목록을 확인한다. CI에서 실행한다.
- `pnpm fonts:check --require-bundled`: 시스템 대체 상태도 실패로 처리한다. 현재는 파일 누락과 비활성화를 보고하는 것이 정상이다.
- `pnpm fonts:test`: 손상된 파일, 잘못된 굵기/내부 이름, 오래된 Android 복사본, iOS 등록 누락을 탐지하는 검사 도구 회귀 테스트.

등록 검사는 저장소 설정의 정적 검사다. Xcode/Gradle의 실제 패키징 결과와 화면의 글꼴 적용은 앱 빌드 후 별도로 확인해야 한다. 표시하는 용량은 원본 TTF 합계이며 APK/IPA 압축 후 증가분은 아니다.
