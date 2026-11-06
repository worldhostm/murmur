# @murmur/signaling

통화 서버의 전송 무관 핵심: 랜덤 매칭 큐, 방(그룹 통화), 세션 상태 기계, 신고 저장, 시그널링 메시지 중계.

- `src/types.ts` 클라이언트/서버 메시지
- `src/matchmaker.ts` FIFO 큐. 성인만, 차단 관계 제외
- `src/rooms.ts` 방 코드(6자), 정원, 호스트 승계, 빈 방 폐기
- `src/session.ts` CallState 전이
- `src/moderation.ts` 신고 기록. self-harm-risk/minor 는 urgent
- `src/server.ts` `createSignalingServer({ transport })`. `Transport` 어댑터 + 테스트용 `InMemoryTransport`

테스트: `pnpm test`.

규칙
- 미디어(표정 프레임, 음성)는 여기를 지나지 않는다. SDP/ICE 중계만 한다. SFU 연동은 별도 어댑터.
- 18세 미만·미인증은 랜덤 매칭을 거부한다. 이 검사를 없애지 않는다.
- 신고 증거는 직전 30초의 face-protocol 프레임과 음성이다. 원본 영상은 존재하지 않는다.
