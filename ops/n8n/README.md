# ops/n8n

n8n 워크플로 JSON 내보내기를 여기에 커밋한다 (PLANNING.md "n8n으로 자동화할 프로세스"). 실시간 통화나 업로드 검수 같은 핵심 로직은 서비스 코드에 둔다.

| 파일 (예정) | 트리거 | 도입 시점 |
| --- | --- | --- |
| `ci-failure-triage.json` | GitHub Actions 실패 웹훅 → 로그 요약, 이슈 생성, 알림 | 0단계 |
| `spec-progress.json` | PR 생성·머지 웹훅 → docs/specs 상태 갱신, 주간 요약 | 0단계 |
| `provider-cost-watch.json` | 매일 + 상태 페이지 폴링 | 1단계 |
| `store-reviews.json` | 매일 → 리뷰 분류, 버그 이슈 등록 | 1단계 출시 직후 |
| `release-notes.json` | 릴리즈 태그 | 1단계 |
| `moderation-queue.json` | 앱 내 신고 이벤트 → 우선순위 배정, 위기 신호 즉시 알림 | 1단계 |
| `upload-manual-review.json` | 자동 검수 "보류" | 2단계 |
| `weekly-metrics.json` | 매주 월요일 | 1단계 |
| `dependency-updates.json` | 매주 | 1단계 |

자동 생성 이슈 템플릿: 재현 방법, 관련 모듈, 완료 조건 칸을 고정한다 (`.github/ISSUE_TEMPLATE/`, 추후).
