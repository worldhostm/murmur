# 솔로 채팅 OpenAI 연동

작성: 2026-11-10. 상태: 계획(승인 대기).

## 목적

솔로 채팅의 캐릭터 답을 스크립트(`ScriptedReplyAdapter`)가 아니라 **실제 LLM(OpenAI)** 이 만들게 한다. API 키는 앱이 아니라 `services/ai-character` 서버가 쥐고, 페르소나·위기 대응·표정 태그는 기존 `ConversationPipeline` 이 그대로 처리한다 (docs/specs/ai-character.md, docs/specs/chat-expression.md).

## 범위

### 1. ai-character: OpenAI LLM 어댑터

- `src/adapters/openai/openAiLlm.ts`: `OpenAiLlm implements LlmAdapter`. Chat Completions API(`POST /v1/chat/completions`, `stream: true`)를 전역 `fetch` 로 호출하고 SSE `data:` 줄을 파싱해 `choices[0].delta.content` 를 토큰으로 낸다. SDK 의존성 없음 (Node 22 fetch).
- 옵션: `apiKey`(필수), `model`(기본 `gpt-4o-mini`), `baseUrl`(기본 `https://api.openai.com/v1`), `temperature`(기본 0.8), `maxOutputTokens`(기본 300), `timeoutMs`(기본 20초), `fetch`(테스트 주입).
- 메시지: `system` = `buildSystemPrompt(...)`, 이후 대화 기록(`user`/`assistant`). `userSignals` 는 시스템 프롬프트에 이미 들어간다.
- 오류: HTTP 오류·타임아웃·끊긴 스트림은 `OpenAiError(status, message)` 로 던진다. 키·응답 원문은 로그에 남기지 않는다.
- 테스트(vitest): 주입한 fetch 가 요청 본문(모델·`stream: true`·system 먼저·기록 순서)을 받는지, SSE 조각이 토큰으로 이어지는지, `[DONE]` 처리, 401 → `OpenAiError`, 타임아웃.

### 2. ai-character: HTTP 서버

- `src/server.ts`: `createChatServer(deps)` 가 `node:http` 서버를 돌려준다 (프레임워크 없음).
  - `POST /chat` 요청 `{ sessionId, characterId, text, adultVerified? }` → 응답 `{ text, expression, crisis }`. `sessionId` 별로 `ConversationPipeline` 을 메모리에 유지해 대화 기록(최근 40개)을 잇는다. 30분 비활성 세션은 지운다.
  - `GET /health` → `{ ok: true, model }`.
  - 잘못된 본문·모르는 `characterId` 는 400, LLM 오류는 502 와 `{ error }`.
  - STT·TTS 는 텍스트 채팅에 필요 없으므로 `FakeStt`/`FakeTts` 를 꽂는다 (프레임·오디오는 버린다).
- `src/main.ts`: 환경 변수 `OPENAI_API_KEY`(필수), `OPENAI_MODEL`, `PORT`(기본 8787)를 읽어 서버를 띄운다. 같은 폴더의 `.env` 를 읽는 작은 로더(의존성 없음). `.env.example` 제공. 스크립트 `pnpm --filter @murmur/ai-character dev`(tsx watch) / `start`.
- 테스트: `server.listen(0)` 에 `FakeLlm` 파이프라인을 꽂고 `http.request` 로 응답 모양, 같은 `sessionId` 두 번째 요청에서 기록이 이어지는지, 위기 문장 → `crisis: true` + LLM 호출 0회, 잘못된 본문 400.

### 3. 앱: 원격 답 어댑터

- `src/chat/RemoteReplyAdapter.ts`(`kind: 'remote'`): `POST {baseUrl}/chat` 에 `{ sessionId, characterId, text }` 를 보내고 `{ text, expression, crisis }` 를 돌려준다. `sessionId` 는 어댑터 인스턴스마다 새로 만든다(캐릭터를 바꾸면 새 어댑터). 타임아웃 25초(AbortController).
- `src/chat/FallbackReplyAdapter.ts`: 1차 어댑터가 실패하면 `console.warn` 후 2차(스크립트)로 답한다. 서버가 꺼져 있어도 채팅이 멈추지 않게 하되, 실패를 숨기지는 않는다(경고 로그).
- `src/config.ts`: `AI_CHARACTER_URL`. 개발 빌드 기본값은 Android 에뮬레이터 `http://10.0.2.2:8787`, iOS 시뮬레이터 `http://localhost:8787`. 릴리스 빌드는 비어 있으면 스크립트 어댑터만 쓴다. Android 디버그 매니페스트는 이미 `usesCleartextTraffic=true`.
- `AppNavigator`: URL 이 있으면 `Fallback(Remote, Scripted)`, 없으면 `Scripted`. 그 외 흐름(듣는 표정 → 답의 표정)은 그대로.
- 테스트(jest): `RemoteReplyAdapter` 가 전역 `fetch` 를 올바른 본문으로 부르고 응답을 매핑하는지, 비정상 응답에서 throw 하는지. `FallbackReplyAdapter` 가 실패 시 2차로 넘어가고 성공 시 1차만 쓰는지.

### 4. 문서

- `services/ai-character/CLAUDE.md`: 어댑터·서버·실행법. `apps/mobile/CLAUDE.md`: `src/chat` 원격 어댑터와 `config.ts`.
- `docs/REMAINING_WORK.md`: 실기기에서는 Mac 의 LAN IP 로 `AI_CHARACTER_URL` 을 바꿔야 한다는 점.

## 범위 밖

- STT/TTS 공급자, 음성 통화 모드의 LLM 연결.
- LLM 이 감정 태그를 직접 내는 프롬프트(지금은 답 텍스트에서 `cueFromText`).
- 대화 요약·장기 기억 저장소, 세션 영속화(서버 재시작 시 기록 소멸).
- 인증·요금 제한·배포. 로컬 개발 서버만.
- 다른 공급자(Claude, Ollama) 어댑터. 인터페이스는 같으므로 뒤에 추가한다.

## 완료 조건

- [ ] `pnpm --filter @murmur/ai-character test`: OpenAiLlm(가짜 fetch), 서버(FakeLlm) 테스트 통과.
- [ ] `pnpm --filter @murmur/mobile test`: 원격·폴백 어댑터 테스트 통과.
- [ ] `pnpm lint`, `pnpm typecheck` 통과. 앱은 `services/*` 를 import 하지 않는다(HTTP 로만 연결).
- [ ] 실제 키로: `services/ai-character/.env` 에 `OPENAI_API_KEY` 를 넣고 `pnpm --filter @murmur/ai-character dev` → 에뮬레이터 솔로 채팅에서 캐릭터 말투의 실제 답이 오고 답에 맞는 표정으로 바뀐다. 서버를 끄면 경고 로그 후 스크립트 답으로 이어진다.

## 열린 질문

- 기본 모델을 `gpt-4o-mini` 로 둘지, 더 새 모델로 바꿀지 (환경 변수로 바꿀 수 있다).
- 서버를 어디에 배포할지, 앱 빌드에 URL 을 어떻게 주입할지(react-native-config 등).
