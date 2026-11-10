# 솔로 채팅 표정 연동

작성: 2026-11-09. 상태: 구현됨 (Android 에뮬레이터 확인). 실제 LLM 답은 ai-character 서비스 연결 후.

## 목적

솔로 모드(텍스트 채팅)에서도 캐릭터가 **내가 보낸 말과 캐릭터의 답에 맞춰 표정을 바꾼다**. 지금 솔로 화면은 보라색 원 자리표시자뿐이고 캐릭터 답도 없다(사용자 메시지만 쌓임). 통화 화면에서 쓰는 표정 시트 아바타(`docs/specs/character-sprite-avatar.md`)를 솔로 화면에도 올리고, 글에서 뽑은 표정 단서를 face-protocol 프레임으로 바꿔 같은 경로로 흘려보낸다.

## 범위

### 1. `@murmur/expression-cues` 패키지 (신규, `packages/expression-cues`)

앱과 ai-character 서비스가 함께 쓰는 "글 → 표정" 규칙. 앱은 `services/*` 를 import 할 수 없으므로 패키지로 둔다. 의존성은 `@murmur/face-protocol` 뿐.

- `SPRITE_EXPRESSIONS`: 표정 시트 10칸 이름을 시트 열 순서로 (`neutral, softSmile, smile, bigSmile, serious, surprised, flustered, worried, sad, angry`). Unity `SpriteExpression` enum 과 같은 순서여야 한다(주석으로 상호 참조).
- `cueFromText(text)`: 한국어·영어 키워드, 이모지, 문장부호(`ㅋㅋ`, `ㅠㅠ`, `!!`, `?!`) 휴리스틱으로 10칸 중 하나를 고른다. 모르면 `neutral`. 강한 감정(화남·슬픔·놀람) 우선, 그다음 웃음, 그다음 걱정·당황·진지.
- `reactionTo(userCue)`: 사용자 말의 단서 → 캐릭터가 **듣는 동안** 짓는 표정. 슬픔→걱정, 화남→진지, 걱정→걱정, 활짝 웃음→활짝 웃음, 미소→미소, 놀람→놀람, 당황→은은한 미소, 진지→진지, 기본→은은한 미소(듣는 얼굴).
- `frameForExpression(expression, timestampMs)`: 표정 → face-protocol `FaceFrame`. 블렌드셰이프 프리셋은 Unity `SpriteExpressionClassifier` 규칙(`SpriteExpression.cs`)을 통과하면 같은 칸이 나오도록 맞춘다. `validateFrame` 을 통과한다. 머리 포즈는 중립.
- 테스트(vitest): 단서 분류 한/영 예문, 반응 매핑, 프리셋 10개가 분류 규칙 TS 포트(`classifyFrame`, Unity 규칙과 수치 동일, 동기화 주석)로 같은 칸으로 돌아오는지, 전부 `validateFrame` 통과.

### 2. ai-character 서비스: 응답에 표정 단서

- `PipelineResponse.expression`: 응답 텍스트에서 `cueFromText` 로 뽑은 캐릭터 표정. LLM 이 감정 태그를 직접 내도록 바꾸는 건 범위 밖(열린 질문).
- 테스트: 가짜 LLM 응답 "됐고. 뭐가 막혔는데." → `neutral`, "ㅋㅋㅋ 그거 완전 최고네." → `bigSmile`, 위기 경로는 `worried`.

### 3. 앱: 솔로 화면에 아바타 + 표정 구동

- `apps/mobile/src/avatar/useAvatarExpression.ts`: `{ enabled, assetKey, expression }` 를 받아 렌더러(`createAvatarRenderer`)를 만들고 `remote` 슬롯(통화 씬에서 보이는 슬롯. `local` 은 비활성)에 아바타를 로드한 뒤, 표정이 바뀔 때와 1초마다 `frameForExpression` 을 인코딩해 push 한다. 화면을 떠나면 dispose. 트래커는 쓰지 않는다(카메라 권한 불필요).
- `SoloScreen`: 상단 보라색 원 대신 `renderer` prop(통화 화면과 같은 `UnityView`)을 세로 초상 카드(화면 너비, 높이 `space[12] × 5`)로 보인다. `speaking` 중에는 기존 `SpeakingIndicator` 를 이름 옆에 유지. "AI 캐릭터" 표시는 그대로.
- `AppNavigator`:
  1. 보내기 → 내 말풍선 추가, `expression = reactionTo(cueFromText(text))`, `speaking = true`.
  2. 답 어댑터(`ChatReplyAdapter`) 호출 → 캐릭터 말풍선 추가, `expression = reply.expression ?? cueFromText(reply.text)`, `speaking = false`.
  3. 첫 인사 상태는 `softSmile`.
- `apps/mobile/src/chat/`: `ChatReplyAdapter` 인터페이스(`reply({ characterId, history, text }) → { text, expression? }`)와 `ScriptedReplyAdapter`. 스크립트 어댑터는 ai-character 서비스가 네트워크로 붙기 전까지의 자리표시자로, 사용자 단서 그룹(`down` 슬픔·걱정·화남 / `up` 웃음 / `neutral`)별로 캐릭터당 2줄씩 i18n(`reply.<id>.<group>`) 에서 고르고 600~1200ms 뒤 돌려준다. 위기 키워드(`@murmur/shared-types` safety 기준 재사용 가능하면 그것, 아니면 ai-character 의 목록과 같은 최소 목록)는 캐릭터 연기 대신 `safety.crisisBody` 문구와 `worried` 로 답한다.
- 테스트(jest): 훅이 `FakeAvatarRenderer` 에 에셋을 로드하고 push 한 프레임이 `classifyFrame` 으로 요청한 표정이 되는지, 표정 변경 시 push 횟수 증가, unmount 시 dispose. `ScriptedReplyAdapter` 그룹 선택·위기 응답. 내비게이터 플로우: 보내기 → 내 말풍선 → 답 말풍선 등장.

### Unity 쪽 변경

없음. 프레임은 기존 `MurmurBridge.OnFaceFrame` → `SpriteExpressionDriver` 로 흐른다. 단, 솔로 → 통화 전환 시 렌더러 dispose/재생성이 한 번 더 일어난다(통화 화면 재진입과 같은 경로).

## 범위 밖

- 실제 LLM/STT/TTS 공급자 연동과 ai-character 서비스의 네트워크 서빙. 스크립트 답은 자리표시자이며 서비스가 붙으면 `ChatReplyAdapter` 구현 하나만 바꾼다.
- LLM 이 감정 태그를 직접 출력하는 프롬프트 설계.
- 표정 전환 애니메이션(크로스페이드), 입 모양 립싱크.
- 캐릭터가 사용자 **카메라** 표정에 반응하는 것(PLANNING 시나리오 C-2). 솔로 화면에서는 카메라를 켜지 않는다.
- iOS 검증(iPhone 없음).

## 완료 조건

- [x] `pnpm --filter @murmur/expression-cues test`: 분류·반응·프리셋 라운드트립·validateFrame 통과.
- [x] `pnpm --filter @murmur/ai-character test`: 응답 `expression` 포함.
- [x] `pnpm --filter @murmur/mobile test`: 훅·어댑터·내비게이터 테스트 통과, 기존 스냅샷 갱신.
- [x] `pnpm lint`, `pnpm typecheck` 통과 (모듈 경계: 패키지는 face-protocol 만, 앱은 packages 만).
- [x] Android 에뮬레이터: 솔로 화면에 캐릭터가 보이고, 슬픈 메시지("I feel so lonely and exhausted today") 를 보내면 걱정 표정 → 답("됐고. 뭐가 막혔는데. 하나씩 보자.")도 걱정. 웃는 메시지("haha that was awesome, love it") 는 활짝 웃음 → 답("오, 됐네. 그거 해냈잖아.")도 활짝 웃음. (adb `input text` 가 ASCII 만 받아 영어 예문으로 확인. 한국어 분류는 단위 테스트로 검증.)

## 열린 질문

- 표정 10칸 목록을 Unity C# 과 TS 두 곳에 손으로 두는 대신 face-protocol 처럼 스키마에서 생성할지 (지금은 주석으로 동기화).
- 서비스가 붙을 때 표정 단서를 서버에서 계산해 내려줄지(지금 설계), 앱에서 계산할지.
