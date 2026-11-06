# @murmur/ai-character

음성 인식 → LLM → 음성 합성 → 표정 프레임 파이프라인. 외부 공급자는 전부 어댑터 뒤에 있다.

- `src/adapters/types.ts` STT/LLM/TTS 인터페이스, ExpressionSignals(표정 수치, 영상 아님)
- `src/adapters/fake/` 테스트용 가짜 구현
- `src/signals.ts` face-protocol 프레임 → 표정 신호
- `src/visemeToFace.ts` viseme → face-protocol 프레임 (입 모양)
- `src/persona/` 캐릭터 4종 요약과 시스템 프롬프트. 원문은 `characters/<id>.md`
- `src/safety.ts` 위기 감지, 위기 안내 문구(109), 휴식 권유 기준
- `src/pipeline.ts` ConversationPipeline

테스트: `pnpm test` (vitest, 가짜 어댑터만 사용).

규칙
- 위기 신호가 감지되면 LLM 을 거치지 않고 `crisisResponse()` 를 낸다. 이 경로를 없애지 않는다.
- 시스템 프롬프트는 항상 "AI 캐릭터" 임을 명시한다. 성인 인증이 없으면 로맨스를 금지한다.
- 사용자 영상·오디오 원본을 저장하지 않는다. 표정은 수치(ExpressionSignals)로만 받는다.
