# @murmur/ai-character

음성 인식 → LLM → 음성 합성 → 표정 프레임 파이프라인. 외부 공급자는 전부 어댑터 뒤에 있다.

- `src/adapters/types.ts` STT/LLM/TTS 인터페이스, ExpressionSignals(표정 수치, 영상 아님)
- `src/adapters/fake/` 테스트용 가짜 구현
- `src/adapters/openai/` OpenAI Chat Completions 스트리밍 어댑터 (fetch + SSE, SDK 없음). 기본 모델 gpt-4o-mini
- `src/server.ts` 솔로 채팅 HTTP 서버 (`POST /chat`, `GET /health`). sessionId 별 ConversationPipeline 을 메모리에 두고 30분 비활성이면 지운다. STT/TTS 는 가짜
- `src/main.ts` 로컬 개발 진입점. `.env`(OPENAI_API_KEY, OPENAI_MODEL, PORT)를 `src/env.ts` 로 읽는다
- `src/signals.ts` face-protocol 프레임 → 표정 신호
- `src/visemeToFace.ts` viseme → face-protocol 프레임 (입 모양)
- `src/persona/` 캐릭터 14종 요약과 시스템 프롬프트. 원문은 `characters/<id>.md`. 새 캐릭터는 `@murmur/shared-types` 의 `AI_CHARACTER_IDS` 에 먼저 넣는다 (persona 테스트가 일치를 검사)
- `src/safety.ts` 위기 감지, 위기 안내 문구(109), 휴식 권유 기준
- `src/pipeline.ts` ConversationPipeline

테스트: `pnpm test` (vitest, 가짜 어댑터만 사용. OpenAI 어댑터는 주입한 fetch 로 검증).

실행: `cp .env.example .env` 에 키를 넣고 `pnpm --filter @murmur/ai-character dev` (기본 8787). Android 에뮬레이터는 `http://10.0.2.2:8787`, 실기기는 Mac 의 LAN IP.

규칙
- 위기 신호가 감지되면 LLM 을 거치지 않고 `crisisResponse()` 를 낸다. 이 경로를 없애지 않는다.
- 시스템 프롬프트는 항상 "AI 캐릭터" 임을 명시한다. 성인 인증이 없으면 로맨스를 금지한다.
- 사용자 영상·오디오 원본을 저장하지 않는다. 표정은 수치(ExpressionSignals)로만 받는다.
