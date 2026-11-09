# @murmur/expression-cues

글(내 메시지, 캐릭터 답)에서 표정 시트 10칸 중 하나를 고르고, 그 표정을 face-protocol 프레임으로 바꾼다. 앱(솔로 채팅)과 ai-character 서비스가 함께 쓴다 (docs/specs/chat-expression.md).

- `expressions.ts` `SPRITE_EXPRESSIONS` 10칸 이름. 순서는 표정 시트 열 순서 = Unity `SpriteExpression` enum (apps/avatar-unity/.../SpriteExpression.cs). 두 곳을 같이 고친다.
- `cue.ts` `cueFromText(text)` 한/영 키워드·이모지·문장부호 점수로 칸 선택. `reactionTo(userCue)` 사용자 말에 캐릭터가 듣는 동안 짓는 표정.
- `presets.ts` `frameForExpression(expression, timestampMs)` 블렌드셰이프 프리셋 → `FaceFrame`. 머리 포즈 중립.
- `classify.ts` Unity `SpriteExpressionClassifier.Classify` 의 TS 포트. 프리셋이 Unity 에서 같은 칸으로 풀리는지 테스트하는 용도. Unity 규칙 수치를 바꾸면 여기도 바꾼다.

표정 데이터는 이 패키지 밖으로 `FaceFrame` 으로만 나간다. 아틀라스·UV 같은 렌더 세부는 Unity 쪽에 있다.
