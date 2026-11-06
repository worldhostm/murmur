# @murmur/face-protocol

표정 수치 규격. 모든 모듈(앱, Unity, 서버)은 표정 데이터를 이 패키지의 형식으로만 주고받는다.

## 책임
- `FaceFrame` 타입(52 ARKit 블렌드셰이프 + 머리 포즈 + 타임스탬프 + 추적 상태)
- v1 바이너리 코덱(144 bytes, little-endian), 검증, JSON 픽스처 변환
- 스키마에서 TS/C#/Swift/Kotlin 타입 생성

## 주요 파일
- `schema/face-frame.schema.json` — 유일한 원본. 블렌드셰이프 순서, 버전, 와이어 레이아웃.
- `scripts/generate.ts` — 스키마 → `dist/generated/*` (TS, C#, Swift, Kotlin).
- `src/codec.ts` — `encodeFrame` / `decodeFrame`. 버전별 디코더 표.
- `src/validate.ts` — `assertFrame` / `validateFrame`.
- `test/fixtures/*.json` — 재생용 표정 픽스처.

## 테스트
```bash
pnpm --filter @murmur/face-protocol test
pnpm --filter @murmur/face-protocol typecheck
pnpm --filter @murmur/face-protocol generate:check
```

## 규칙
- 스키마를 바꾸면 `protocolVersion`을 올리고, 이전 버전(N-1) 디코더를 `DECODERS` 표에 남긴다.
- 스키마를 바꾼 뒤 반드시 `pnpm generate`. `dist/generated/*`는 직접 고치지 않는다(테스트가 잡는다).
- 런타임 의존성 없음. zod 등을 추가하지 않는다.
- 원본 카메라 영상이나 픽셀 데이터를 담는 필드를 추가하지 않는다.
