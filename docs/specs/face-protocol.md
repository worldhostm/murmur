# 스펙: face-protocol (표정 수치 규격)

상태: 구현됨 (v1) · 패키지: `packages/face-protocol` (`@murmur/face-protocol`)

## 목적

카메라 영상 대신 표정 계수와 머리 포즈만 주고받기 위한 단일 규격. 앱(React Native), Unity 렌더러, 통화 서버, AI 캐릭터 서비스가 전부 이 규격 하나로 통신한다. 원본 영상은 기기 밖으로 나가지 않는다는 프라이버시 원칙의 기술적 근거다.

## 범위

- `FaceFrame` 데이터 모델: 버전, 타임스탬프(세션 시작 기준 ms), 추적 상태(`tracked`·`limited`·`lost`), ARKit 52개 블렌드셰이프(0..1), 머리 포즈(단위 쿼터니언 + 카메라 기준 위치 m).
- v1 바이너리 코덱(고정 144 bytes, little-endian). 초당 30프레임 기준 약 4.3 KB/s.
- 검증(`assertFrame`/`validateFrame`)과 JSON 픽스처 변환(`frameToJson`/`frameFromJson`).
- 스키마(`schema/face-frame.schema.json`) 하나에서 TypeScript, C#(Unity), Swift(ARKit), Kotlin(MediaPipe) 타입·상수 생성.
- 무표정 프레임(`neutralFrame`)과 재생용 픽스처(`test/fixtures/*.json`).

## 범위 밖

- 전송 계층(WebRTC 데이터 채널, 패킷 손실 보간, 지터 버퍼). `services/signaling` 담당.
- 트래커별 어댑터(ARKit, MediaPipe 결과를 FaceFrame 으로 바꾸는 코드). 앱의 네이티브 모듈 담당.
- 마스코트 리타깃(52개 → 마스코트 표정) 매핑. Unity 렌더러 담당.
- 손·몸 트래킹, 음성 데이터. 필요해지면 버전을 올려 추가한다.

## 와이어 레이아웃 (v1)

| offset | bytes | 타입 | 필드 | 메모 |
| --- | --- | --- | --- | --- |
| 0 | 2 | u8[2] | magic | `0x4D 0x46` ("MF") |
| 2 | 1 | u8 | version | 1 |
| 3 | 1 | u8 | tracking | 0 tracked, 1 limited, 2 lost |
| 4 | 8 | f64 | timestampMs | 세션 시작 기준 ms |
| 12 | 104 | u16[52] | blendShapes | 0..65535 ↔ 0.0..1.0, 클램프 |
| 116 | 16 | f32[4] | rotation | 단위 쿼터니언 x, y, z, w |
| 132 | 12 | f32[3] | position | 카메라 기준 m, x, y, z |
| **합계** | **144** | | | |

블렌드셰이프 순서는 Apple ARKit `ARFaceAnchor.BlendShapeLocation` 순서(`eyeBlinkLeft` … `tongueOut`)와 같다. MediaPipe Face Landmarker 는 같은 이름을 쓰되 index 0 에 `_neutral` 이 붙으므로 Kotlin 생성물에 `MEDIAPIPE_INDEX_OFFSET = 1` 을 둔다.

## 버전 정책

- 헤더의 `version` 으로 디코더를 고른다. 현재 버전 N 과 N-1 을 받는다. N-2 는 거부한다(`UnsupportedVersionError`).
- 스키마를 바꾸면 `protocolVersion` 을 올리고, `src/codec.ts` 의 `DECODERS` 표에 새 디코더를 추가하고 N-1 디코더를 남긴다.
- v1 이 최초 버전이므로 현재는 v1 만 받는다.
- 생성물(`dist/generated/*`)은 직접 수정하지 않는다. 스키마 수정 후 `pnpm generate`. 테스트가 불일치를 잡는다.

## 완료 조건 (테스트)

- [x] 시드 고정 난수 프레임 200개 인코드→디코드 왕복: 블렌드셰이프 오차 ≤ 1/65535, float 필드 1e-6 이내, 타임스탬프·추적 상태 동일
- [x] `FRAME_BYTE_LENGTH` = 144 이고 인코딩 길이와 같다
- [x] 잘못된 magic → `InvalidFrameError`, 미지원 버전(예: 9) → `UnsupportedVersionError`(버전 번호 포함), 잘린 버퍼 → `InvalidFrameError`
- [x] 범위 밖 입력(−0.5, 1.5, NaN)은 0 / 1 / 0 으로 클램프되어 인코딩
- [x] 디코딩 결과에 NaN 이 없다 (float 바이트가 NaN 이어도 0 으로)
- [x] `validateFrame` 거부: 개수 ≠ 52, NaN, 범위 밖, 비단위 쿼터니언(허용 오차 1e-3), 알 수 없는 추적 상태, 음수 타임스탬프
- [x] `test/fixtures/smile.json`, `neutral.json` JSON 왕복과 JSON→바이너리→JSON 왕복
- [x] `BLEND_SHAPE_NAMES` 는 52개 고유, 스키마 순서와 동일, `blendShapeIndex('jawOpen') === 17`
- [x] 생성물이 스키마와 일치(생성기를 임시 폴더에 돌려 diff), 모든 언어 생성물이 같은 순서로 52개 이름을 담음
- [x] `pnpm typecheck`, `pnpm lint` 통과

## 성능 메모

- 30 fps × 144 B ≈ 4.3 KB/s. 1시간 통화 약 15 MB.
- 인코더는 프레임마다 `ArrayBuffer` 하나만 할당한다. 핫 패스에서 더 줄여야 하면 호출자가 버퍼를 재사용하는 `encodeFrameInto` 를 추가한다(현재 미구현).
