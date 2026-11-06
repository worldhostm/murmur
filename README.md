# Murmur

캠 속 표정을 캐릭터에 입혀 얼굴을 드러내지 않고 사람·AI 캐릭터와 대화하는 iOS·Android 앱.

- 기획: [docs/PLANNING.md](docs/PLANNING.md)
- 디자인 시스템: [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- 스펙: [docs/specs/](docs/specs/) · 결정 기록: [docs/adr/](docs/adr/)
- 작업 규칙: [CLAUDE.md](CLAUDE.md)

## 시작

```bash
pnpm install
git config core.hooksPath .githooks   # pre-commit: lint, typecheck, generate:check
pnpm generate && pnpm test
```

## 구조

| 경로 | 역할 |
| --- | --- |
| `apps/mobile` | React Native 앱 셸 |
| `apps/avatar-unity` | Unity 아바타 렌더러 (임베드) |
| `packages/face-protocol` | 표정 수치 규격·코덱, TS/C#/Swift/Kotlin 생성 |
| `packages/design-tokens` | 디자인 토큰 원본과 TS/C# 생성 |
| `packages/shared-types` | 공용 도메인 타입 |
| `services/signaling` | 통화 매칭·방·시그널링 |
| `services/ai-character` | STT → LLM → TTS → 표정 파이프라인 |
| `services/upload-check` | VRM·이미지 검수 |
