# @murmur/upload-check

VRM·glTF 캐릭터와 실사·일러스트 이미지 업로드 검수. 결과는 approved / rejected / hold 와 사유 코드.

- `src/types.ts` 상한값, 결과 타입, 필요한 블렌드셰이프(face-protocol 52개)
- `src/adapters/types.ts` ModelInspector, FaceDetector, RealPersonClassifier, ContentSafetyAdapter
- `src/adapters/fake.ts` 테스트용 가짜 어댑터
- `src/checkModel.ts` 3D 모델 규칙 / `src/checkImage.ts` 이미지 규칙 / `src/index.ts` `checkUpload` 진입점

테스트: `pnpm test`.

규칙
- 기본 공개 범위는 항상 private. 결과 metadata.visibility 를 다른 값으로 만들지 않는다.
- 실존 인물 사진은 본인 인증 없이는 approved 가 될 수 없다. 유명인 유사도는 반려.
- hold 는 사람 검토 큐(n8n "업로드 수동 검토")로 간다. 자동 승인으로 바꾸지 않는다.
