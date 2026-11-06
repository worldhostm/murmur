# 스펙: signaling

상태: 뼈대 구현됨 (2026-11-06). WebSocket 전송과 SFU 연동은 미구현.

## 목적

랜덤 매칭, 방(그룹 통화), 세션 상태, 신고·차단을 전송 계층과 무관하게 구현한다. 미디어(표정 프레임·음성)는 여기를 지나지 않고 SDP/ICE 만 중계한다.

## 범위

- 메시지 규격: `join-random`, `leave-queue`, `create-room`, `join-room`, `leave`, `offer`, `answer`, `ice`, `report`, `block` / 이벤트 `matched`, `peer-joined`, `peer-left`, `room-created`, `reported`, `error`
- 매칭 큐: FIFO, 성인 인증 사용자만, 차단 관계 제외
- 방: 6자 코드(혼동 문자 제외), 정원 기본 6, 호스트 승계, 빈 방 폐기
- 세션 상태 기계: idle → connecting → connected ⇄ reconnecting → ended
- 신고 저장: 직전 30초 face-protocol 프레임·음성을 증거 창으로 표시, self-harm-risk/minor 는 urgent
- `Transport` 어댑터와 테스트용 `InMemoryTransport`

## 범위 밖

- WebSocket/HTTP 서버 바인딩, 인증, 레이트 리밋
- SFU(미디어 서버) 연동
- 신고 증거의 실제 저장소와 보존 기간
- 음성 모더레이션(욕설·성희롱 탐지)

## 완료 조건

- [x] 미성년·미인증 `join-random` → `age-restricted` 에러, 큐에 들어가지 않음
- [x] 성인 둘 → 양쪽 `matched`, 같은 sessionId
- [x] 차단 관계는 짝짓지 않고 다음 사용자와 매칭
- [x] 방 코드 형식, 정원 초과 `room-full`, 없는 방 `room-not-found`, 호스트 승계, 빈 방 폐기
- [x] 잘못된 상태 전이는 throw
- [x] 세션 밖 사용자에게 SDP/ICE 중계 거부
- [x] 신고 urgent 분류, 연결 끊김은 leave 와 같음

## 열린 질문

- 매칭 대기 상한과 취소 UX
- 방 코드 충돌·만료 정책
- 신고 시 즉시 통화 종료 여부
