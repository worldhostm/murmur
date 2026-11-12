# Murmur Design System

> Claude Code 작업 기준 문서. UI를 만들거나 고칠 때 이 문서의 토큰과 규칙만 쓴다.
> 값이 여기 없으면 새로 만들지 말고 사람에게 묻는다.

## 0. 작업 규칙 (먼저 읽을 것)

1. **하드코딩 금지.** 색, 글꼴 크기, 간격, 모서리 값은 반드시 `packages/design-tokens`의 토큰으로 참조한다. 컴포넌트 안에 `#6B3FD4`, `16`, `24` 같은 리터럴을 쓰지 않는다.
2. **토큰의 원본은 하나.** `packages/design-tokens/tokens.json`이 원본이고, TypeScript(React Native)와 C#(Unity) 코드는 이 파일에서 생성한다. 생성된 파일은 직접 고치지 않는다.
3. **새 토큰이 필요하면** 직접 추가하지 말고 PR 설명에 "토큰 추가 제안"으로 적는다.
4. **두 테마 모두 확인.** 화면을 만들면 `light`와 `dark` 양쪽에서 스냅샷 테스트를 남긴다.
5. **대비 기준.** 본문 4.5:1, 큰 글자(24px 이상)·아이콘·컨트롤 테두리 3:1. 아래 조합표에 없는 글자색/배경색 조합을 새로 쓰면 대비를 계산해 테스트에 넣는다.

## 1. 브랜드 원칙

- **가깝되 무겁지 않게.** 이름처럼 속삭이듯 조용하고 가깝다. 위로가 필요한 사용자가 많으므로 화면이 우울하게 느껴지면 안 된다.
- **세련된 밤, 다정한 낮.** 보라가 공통 색. 밤은 보라 × 검정, 낮은 라벤더 × 크림.
- **캐릭터가 주인공.** UI는 캐릭터 얼굴을 가리지 않게 물러선다. 장식보다 여백.

## 2. 테마

| 테마 ID | 이름 | 쓰는 곳 |
| --- | --- | --- |
| `light` | Lavender | 솔로 모드(기본값), 온보딩, 캐릭터 고르기, 한서린·세라의 낮 장면 |
| `dark` | Night | 랜덤 매칭, 방 통화, 서도윤·레온의 밤 장면, 사용자가 다크를 고른 경우 |

**테마 결정 로직 (구현 필수)**

```ts
type ThemeId = 'light' | 'dark';

function resolveTheme(params: {
  screen: 'solo' | 'onboarding' | 'character-select' | 'random-match' | 'room-call' | 'other';
  userPreference: ThemeId | 'system';
  systemScheme: ThemeId;
}): ThemeId {
  const { screen, userPreference, systemScheme } = params;
  if (userPreference !== 'system') return userPreference;      // 사용자가 고르면 항상 우선
  if (screen === 'solo' || screen === 'onboarding' || screen === 'character-select') return 'light';
  if (screen === 'random-match' || screen === 'room-call') return 'dark';
  return systemScheme;
}
```

- 솔로 모드는 사용자가 직접 바꾸지 않는 한 항상 `light`로 시작한다.
- 통화 화면의 오버레이(이름표, 통화 컨트롤)는 테마와 무관하게 `night` 배경 + `ink-on-night` 글자를 쓴다.

## 3. 색상 토큰

| 토큰 | light | dark | 용도 |
| --- | --- | --- | --- |
| `surface-100` | `#FBF8FF` | `#0E0B14` | 화면 배경 |
| `surface-200` | `#F3EDFC` | `#17121F` | 섹션 묶음, 입력창 배경 |
| `surface-300` | `#FFFFFF` | `#211A2C` | 카드, 시트, 상대방 말풍선 |
| `night` | `#1A1324` | `#2A2040` | 통화 화면 오버레이, 밤 분위기 면 |
| `ink` | `#1E1729` | `#F2EDF8` | 본문 글자 |
| `ink-muted` | `#5E5470` | `#B3A8C4` | 보조 글자, 시간, 캡션 |
| `ink-on-night` | `#F2EDF8` | `#F2EDF8` | `night` 위의 글자 |
| `brand` | `#6B3FD4` | `#A98BFF` | 주 버튼, 활성 탭, 링크, 포커스 링, 내 말풍선 |
| `on-brand` | `#FFFFFF` | `#140E1F` | `brand` 위의 글자·아이콘 |
| `brand-soft` | `#EBE3FD` | `#2C2142` | 선택된 행, 칩, 약한 강조 배경 |
| `lavender` | `#D9CCFF` | `#5B45A0` | 장식 면, 물결 모티프 (dark에서 본문 배경 금지) |
| `accent` | `#B8366E` | `#FF8FBE` | AI 캐릭터 존재 신호: 말하는 중 표시, 캐릭터 이름표, 하트 (작은 면적만) |
| `cream` | `#FFF6EA` | `#2A2219` | 솔로 모드 따뜻한 카드 (오늘의 기분, 노래 추천) |
| `border` | `#E2DAF0` | `#2F2640` | 구분선, 카드·입력 테두리 |
| `border-strong` | `#8C7FA3` | `#7A6D90` | 3:1이 필요한 컨트롤 테두리 (체크박스, 꺼진 토글) |
| `success` | `#1F7A52` | `#5FD39B` | 연결됨, 인증 완료, 업로드 승인 |
| `warning` | `#9A5B00` | `#FFB547` | 약한 네트워크, 검수 중 |
| `danger` | `#B42E2E` | `#FF7B7B` | 신고, 차단, 통화 종료, 삭제 확인 |

### 검증된 글자/배경 조합

| 글자 | 배경 | light 대비 | dark 대비 |
| --- | --- | --- | --- |
| `ink-muted` | `surface-200` / `surface-300` | 6.16 | 7.46 |
| `brand` | `surface-100` | 6.08 | 7.27 |
| `on-brand` | `brand` | 6.39 | 7.03 |
| `accent` | `surface-300` | 5.54 | 7.95 |
| `ink-on-night` | `night` | 15.69 | 13.23 |
| `ink-muted` / `ink` | `cream` | 6.59 | 13.6 |
| `border-strong` | `surface-300` | 3.7 | 3.54 |

### 색 사용 규칙

- 화면당 `brand` 채움 버튼은 **하나**(주 행동)만.
- `accent`는 AI 캐릭터 관련 신호에만. 사람 사용자의 UI 요소에 쓰지 않는다.
- 상태는 색만으로 구분하지 않는다. 아이콘이나 문구를 함께 둔다.
- 금지: 그라데이션, 파랑-보라 그라데이션, 큰 그림자, 왼쪽 굵은 테두리 카드, 이모지 장식 카드.

## 4. 타이포그래피

| 패밀리 | 글꼴 | 용도 |
| --- | --- | --- |
| `display` | Noto Serif KR | 앱 이름, 캐릭터 이름, 온보딩의 큰 감성 문장만 |
| `sans` | Noto Sans KR | 그 외 전부 |

| 스타일 | 패밀리 | 크기 / 줄높이 | 굵기 | 용도 |
| --- | --- | --- | --- | --- |
| `display-lg` | display | 40 / 48 | 600 | 온보딩 큰 문장, 캐릭터 소개 화면 이름 |
| `display-md` | display | 28 / 36 | 600 | 캐릭터 카드 이름 |
| `display-compact` | display | 32 / 42 | 600 | 작은 화면·큰 글자 온보딩 |
| `character-name` | display | 24 / 32 | 600 | 캐릭터 목록 이름 |
| `title` | sans | 20 / 28 | 700 | 화면 제목 |
| `heading` | sans | 17 / 24 | 600 | 섹션 제목 |
| `body` | sans | 16 / 26 | 400 | 채팅 메시지, 본문 |
| `body-sm` | sans | 14 / 22 | 400 | 보조 설명 |
| `label` | sans | 15 / 22 | 600 | 버튼 |
| `caption` | sans | 12 / 16 | 500 | 시간, 메타 정보, "AI 캐릭터" 표시 |

- 글꼴 파일은 OFL 라이선스로 앱에 번들한다 (`apps/mobile/assets/fonts/`).
- 동남아 출시 시 태국어·베트남어·인도네시아어를 지원하는 Noto 계열을 fallback으로 추가한다.
- 시스템 글자 크기 설정(Dynamic Type / Android font scale)을 따르되, 통화 화면 오버레이는 최대 1.3배로 제한한다.

## 5. 간격

4px 단위. 아래 값 외의 간격은 쓰지 않는다.

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `space-1` | 4 | 아이콘-라벨 사이 |
| `space-2` | 8 | 관련 항목 사이, 말풍선 사이 |
| `space-3` | 12 | 말풍선 안쪽 여백, 리스트 행 세로 여백 |
| `space-4` | 16 | 화면 좌우 여백, 카드 안쪽 여백 |
| `space-6` | 24 | 화면 내 섹션 간격 |
| `space-8` | 32 | 화면 상단~첫 제목, 시트 안쪽 여백 |
| `space-12` | 48 | 통화 컨트롤과 화면 하단 사이 |

## 6. 모서리

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `radius-sm` | 8 | 칩, 태그, 입력창 |
| `radius-md` | 16 | 카드, 말풍선 |
| `radius-lg` | 24 | 바텀시트, 캐릭터 카드, 통화 영상 프레임 |
| `radius-pill` | 999 | 주 버튼, 통화 컨트롤, 아바타 상태 링 |

## 7. 핵심 컴포넌트 규칙

| 컴포넌트 | 규칙 |
| --- | --- |
| 주 버튼 | 배경 `brand`, 글자 `on-brand` `label`, 높이 52, `radius-pill`. 화면당 하나 |
| 보조 버튼 | 배경 없음, 테두리 `border`, 글자 `ink` `label`, 높이 52, `radius-pill` |
| 내 말풍선 | 배경 `brand`, 글자 `on-brand` `body`, 패딩 `space-3`, `radius-md` |
| 상대 말풍선 | 배경 `surface-300`, 글자 `ink` `body`, 테두리 `border` |
| AI 캐릭터 말풍선 | 상대 말풍선과 같되, 위에 캐릭터 이름(`accent` `caption`)과 "AI 캐릭터" 표시 |
| 캐릭터 카드 | 배경 `surface-300`, `radius-lg`, 이름 `character-name`, 세계관 한 줄 `body-sm` `ink-muted` |
| 통화 컨트롤 | 지름 56 원형(`radius-pill`), 배경 `night` 80% 불투명, 아이콘 `ink-on-night`, 종료 버튼만 `danger` 배경. 터치 영역 최소 48 |
| 말하는 중 표시 | 캐릭터 이름표 주위 물결 링 3개, 색 `accent`, 1.2초 주기로 퍼짐. "동작 줄이기" 설정 시 정지 상태로 표시 |
| 솔로 모드 기분 카드 | 배경 `cream`, `radius-md`, 글자 `ink` |
| 신고·차단 | 통화 화면에서 한 번 탭으로 접근. 색 `danger` + 아이콘 + 문구 |

## 8. 모티프

물결(속삭임이 퍼지는 동심원 호)이 유일한 브랜드 모티프다. 말하는 중 표시, 로딩, 빈 화면 장식에 쓴다. 얼굴·마스코트 그림을 장식으로 쓰지 않는다. 화면 속 얼굴은 캐릭터 하나뿐이어야 한다.

## 9. 말투 (UI 문구)

- 짧고 다정한 해요체. 예: "연결하는 중이에요", "오늘 이야기, 여기 남겨 둘게요".
- 재촉·압박 문구 금지. 예: "지금 결제하세요", "놓치면 후회해요".
- AI 캐릭터 대화 화면에는 항상 "AI 캐릭터" 표시를 둔다.
- 위기 상황 안내는 캐릭터 말투가 아니라 서비스의 차분한 말투로 쓴다.
- 모든 문구는 i18n 키로 관리한다 (`apps/mobile/src/i18n/`). 한국어·영어 먼저.

## 10. 구현 위치

```text
packages/design-tokens/
  tokens.json          # 원본 (이 문서의 표와 같은 값)
  scripts/generate.ts  # tokens.json → 아래 두 파일 생성
  dist/tokens.ts       # React Native용 (생성물, 수정 금지)
  dist/Tokens.cs       # Unity용 (생성물, 수정 금지)
apps/mobile/src/theme/
  ThemeProvider.tsx    # resolveTheme 로직 + 컨텍스트
  useTheme.ts          # 컴포넌트에서 토큰 접근
```

**React Native 사용 예**

```tsx
const { color, space, radius, text } = useTheme();

<Pressable style={{
  backgroundColor: color.brand,
  paddingHorizontal: space[4],
  borderRadius: radius.pill,
  minHeight: 52,
}}>
  <Text style={[text.label, { color: color.onBrand }]}>시작하기</Text>
</Pressable>
```

- 토큰 이름의 `-`는 TS에서 camelCase로 바꾼다 (`on-brand` → `onBrand`, `surface-100` → `surface100`).
- Unity 쪽은 통화 화면 배경과 캐릭터 주변 장식에만 토큰을 쓴다. 텍스트 UI는 React Native가 그린다.

## 11. 완료 조건 체크리스트

- [ ] 리터럴 색·간격·모서리 값이 없다 (lint 규칙 통과)
- [ ] `light`, `dark` 스냅샷 테스트가 있다
- [ ] 새로운 글자/배경 조합의 대비 테스트가 있다
- [ ] 터치 영역 48 이상
- [ ] "동작 줄이기" 설정에서 애니메이션이 멈춘다
- [ ] 문구가 i18n 키로 들어가 있다
- [ ] AI 캐릭터 화면에 "AI 캐릭터" 표시가 있다

## 12. 폰트·레이아웃 개선 제안 (2026-11-11)

[폰트·가독성·화면 구조 개선안](specs/design-readability-layout.md)에 현재 구현 진단, 우선순위, 타입 스케일과 레이아웃 토큰 제안, 화면별 적용 기준을 정리했다. 폰트 번들 확정과 키보드 대응을 P0로, 대화/기분 기록 분리와 초대 화면 위계 개선을 P1로 둔다. 현재 토큰과 UI는 변경하지 않았으며, 제안값은 실제 폰트 렌더링 검증 후 이 문서의 해당 표와 함께 반영한다.


### 2026-11-11 적용된 디자인 개선

- body 16/26, body-sm 14/22, label 15/22 및 display-compact/character-name 역할을 토큰 원본에 적용했다. Noto 파일 번들은 아직 미완료다.
- `layout` 토큰: content-max-width 560, compact-width 360, wide-width 600, solo-avatar-height 192, solo-avatar-max-height-ratio 0.30, compact-avatar-size 48, input-min-height 52, input-max-lines 5, bubble-max-width-ratio 0.86, large-font-scale 1.5. wide-width는 향후 분기용이며 현재 화면은 최대 폭으로 대응한다.
- 입력창은 surface-200 + border-strong, 포커스 brand, 오류 danger. 관련 대비 테스트를 추가했다. 필수 설명은 body-sm 이상을 쓴다.
- 대화는 고정 헤더/입력창과 별도 메시지 목록으로 구성한다. 기록 화면을 별도로 열고, 기록 작성/조회는 탭으로 전환한다. 기존 기록 초안과 채팅 초안은 화면 전환 중 유지한다.
- 보조 이동/날짜 선택은 최소 터치 48의 TextButton, 주요 행동은 PrimaryButton을 사용한다. 선택 항목은 배경/밑줄과 접근성 상태를 함께 표시한다.
