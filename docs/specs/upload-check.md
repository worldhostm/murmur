# 스펙: upload-check

상태: 뼈대 구현됨 (2026-11-06). 실제 파서·검출기는 미구현.

## 목적

VRM·glTF 캐릭터와 정면 이미지 업로드를 자동 검수해 approved / rejected / hold 로 나눈다. hold 는 사람 검토 큐로 간다. 기본 공개 범위는 private 이다.

## 범위

- 상한: 파일 64MB, 삼각형 70,000, 텍스처 32MB, 이미지 짧은 변 1024px
- 3D 모델 규칙: 용량·폴리곤·텍스처 초과 반려, 블렌드셰이프 52개 중 40개 이상이면 자동 보정 보류(`auto-retarget-needed`), 미만이면 반려, VRM 이용 허락이 author 전용이고 제작자 주장이 다르면 보류(`license-review`), 부적절 콘텐츠 반려
- 이미지 규칙: 얼굴 1개가 아니면 반려, 해상도·정면 아니면 반려, 부적절 콘텐츠 반려, 실존 인물+유명인 유사 반려(`celebrity`), 실존 인물+본인 인증 없음 보류(`identity-verification-required`)
- 어댑터: ModelInspector, FaceDetector, RealPersonClassifier, ContentSafetyAdapter + 가짜 구현

## 범위 밖

- 실제 VRM/glTF 파서, 얼굴 검출·실존 인물·유명인 분류 모델, 콘텐츠 안전 API
- 본인 인증 절차 자체
- 공개 공유 동의·권리 확인 절차
- 업로드 후 미리보기(내 얼굴로 움직여 보기)

## 완료 조건

- [x] 규칙별 반려·보류·승인 테스트 (위 항목 전부)
- [x] 반려가 보류보다 우선
- [x] `checkUpload` 결과 metadata.visibility 가 항상 'private'

## 열린 질문

- 자동 리타깃이 가능한 최소 블렌드셰이프 집합(40개 기준의 근거)
- 유명인 유사도 임계값과 오탐 시 이의 제기 절차
