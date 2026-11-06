# Murmur

캠 속 표정을 캐릭터에 입혀 얼굴을 드러내지 않고 대화하는 iOS·Android 앱. 기획은 `docs/PLANNING.md`, UI 규칙은 `docs/DESIGN_SYSTEM.md`가 원본이다. 두 문서와 충돌하는 코드는 문서가 이긴다.

## 저장소 구조

```text
apps/mobile/          React Native 앱 셸 (TypeScript). 일반 화면 전부.
apps/avatar-unity/    Unity(URP) 아바타 렌더러. 앱에 라이브러리로 임베드.
services/signaling/   통화 서버 (WebRTC 시그널링·SFU 연동)
services/ai-character/ 음성 인식 → LLM → 음성 합성 → 표정 계수
services/upload-check/ VRM·이미지 검수
packages/face-protocol/ 표정 수치 규격 (스키마 + 코덱 + 다국어 타입 생성)
packages/design-tokens/ 디자인 토큰 원본(tokens.json) + TS/C# 생성
packages/shared-types/  공용 도메인 타입
docs/specs/           기능 스펙 (목적·범위·범위 밖·완료 조건)
docs/adr/             기술 결정 기록
```

워크스페이스 패키지 이름은 `@murmur/<폴더명>`.

## 명령

```bash
pnpm install              # 의존성
pnpm generate             # tokens.json, face-protocol 스키마 → 생성물 (dist/)
pnpm build                # packages, services 빌드
pnpm test                 # 전체 테스트 (packages/services: vitest, mobile: jest)
pnpm typecheck            # 전체 타입 검사
pnpm lint                 # eslint + 모듈 경계 검사(scripts/check-boundaries.ts)
pnpm generate:check       # 생성물이 원본과 일치하는지 (CI, pre-commit)
pnpm perf:budget          # 성능 예산 (코덱·립싱크 프레임 생성·파이프라인 오버헤드). 초과 시 실패
pnpm sync:unity           # 생성된 C#을 apps/avatar-unity/Assets/Murmur/Generated/로 복사
```

처음 한 번: `git config core.hooksPath .githooks` (pre-commit에서 lint, typecheck, generate:check).

패키지 하나만: `pnpm --filter @murmur/face-protocol test`.

## 모듈 경계 (lint로 강제)

- `apps/*`와 `services/*`는 `packages/*`만 import 한다. 서비스끼리, 앱끼리 서로의 코드를 가져다 쓰지 않는다.
- 모듈 간 표정 데이터는 반드시 `@murmur/face-protocol`을 거친다. 손으로 맞춘 타입 금지.
- 트래킹(ARKit, MediaPipe), LLM, STT, TTS, 실사형 모델은 어댑터 인터페이스 뒤에 둔다. 공급자 교체는 어댑터 하나만 바꾼다.

## 금지 사항

- 원본 카메라 영상을 저장하거나 기기 밖으로 전송하는 코드. 전송은 표정 수치(face-protocol)와 음성만.
- `face-protocol`을 거치지 않는 모듈 간 표정 데이터 교환.
- UI 코드의 색·간격·모서리·글꼴 크기 리터럴. `useTheme()` 토큰만 쓴다 (`docs/DESIGN_SYSTEM.md` §0).
- 생성물(`packages/*/dist/**`) 직접 수정. 원본(`tokens.json`, `schema/*.json`)을 고치고 `pnpm generate`.
- AI 캐릭터 화면에서 "AI 캐릭터" 표시 제거. 사용자 체류 시간을 늘리려는 설계(애착 유도, 결제 압박, 재촉 문구).
- 외부 아바타 플랫폼(Ready Player Me 류)에 대한 의존.

## 작업 사이클

1. `docs/specs/<기능>.md`에 스펙(목적, 범위, 범위 밖, 완료 조건)을 쓴다.
2. 계획을 사람이 검토·승인한다.
3. 한 작업당 한 브랜치, 한 PR. 기능 단위로 커밋을 나눈다.
4. 테스트·lint·typecheck 통과가 완료 조건이다.

## 규칙 추가 로그

같은 실수를 두 번 하면 여기에 규칙으로 올린다.

- (아직 없음)
