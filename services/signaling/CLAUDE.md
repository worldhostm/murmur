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

### HTTP 전송 (2026-11-11)

- `src/http.ts`: 익명 로컬 개발 연결 토큰, 커서 폴링, 60초 비활성 정리. 클라이언트의 성인 주장은 무시한다.
- `src/main.ts`: `pnpm --filter @murmur/signaling dev`, 기본 localhost:8788. HOST/PORT로 명시적 변경.
- wire 타입 원본은 `packages/shared-types/src/signaling.ts`; 서비스 types.ts는 재내보내기한다.
- 신고는 현재 세션의 상대만 받는다. 차단은 서버 메모리 및 현재 연결 식별자 범위다. 운영 배포 전 계정 인증·영속화가 필요하다.
