# 캐릭터 표정 시트 아바타 (PoC)

작성: 2026-11-06. 상태: 구현됨 (Android 에뮬레이터 확인).

## 목적

기획 캐릭터 4종(서도윤·레온 하르트·한서린·세라)이 통화 화면에 **실제 얼굴로 보이고 내 표정에 반응**하게 한다. PLANNING.md 가 정한 최종 방식(일러스트 한 장을 신경망으로 구동하는 실사형 렌더)은 서버 GPU 와 외주 원화가 필요하므로, 그 전까지 표정 시트 10칸을 표정 수치로 골라 보여주는 2D 스프라이트 방식을 쓴다.

## 범위

- 입력: 표정 시트 PNG (캐릭터 4행 × 표정 10열, `/Users/iesg/Downloads/murmur_face_expression_1106` 과 같은 형식). `scripts/slice-expression-sheet.py` 가 캐릭터별 1024×512 아틀라스(137×240 셀 5×2)를 `apps/avatar-unity/Assets/Murmur/Resources/Characters/<id>.png` 로 만든다.
- 2026-11-12: 신규 10인은 상반신 표정 세트(캐릭터당 표정 8칸)에서 `scripts/slice-character-expressions.py` 가 같은 아틀라스 규격으로 만든다. 8칸을 10칸에 매핑하고(미소 2단계·걱정/슬픔·진지/기본은 같은 그림) 위아래 짧은 띠는 어둡게 채운다 (docs/specs/character-roster.md).
- 에셋 키: `characters/<id>/front` (`@murmur/shared-types` 의 `AI_CHARACTERS[].avatar.assetKey` 와 동일). 앱은 캐릭터 선택 화면에서 고른 캐릭터의 키를 통화 화면 렌더러에 보낸다 (`avatarAssetKeyFor`).
- Unity: `SpriteSheetAvatarLoader` 가 키를 받아 아틀라스를 입힌 쿼드를 만들고, `SpriteExpressionDriver` 가 face-protocol 프레임을 스무딩 → `SpriteExpressionClassifier` 로 10칸 중 하나를 골라 UV 를 바꾼다. 최소 유지 150ms. 머리 포즈는 roll 기울기(±12°)와 작은 평행이동으로만.
- 분류 규칙 (ARKit 블렌드셰이프, 우선순위 순): 화남(browDown>0.45, smile<0.25) → 활짝 웃음(smile>0.55 또는 smile>0.35+jaw>0.25) → 놀람(jaw>0.3 + eyeWide>0.3/browInnerUp>0.45) → 슬픔(frown>0.3 또는 browInnerUp>0.5+입 다묾) → 미소(smile>0.3) → 걱정(browInnerUp>0.3) → 당황(jaw>0.25) → 진지(eyeSquint>0.35 또는 browDown>0.25) → 은은한 미소(smile>0.12) → 기본. 추적 끊김은 기본.

## 범위 밖

- 입 모양(아·이·우·에·오) 립싱크, 눈 깜빡임, 시선. 시트에 해당 칸이 없다.
- 셀 간 크로스페이드. 지금은 즉시 전환 + 유지 시간.
- 출시용 일러스트. 현재 아틀라스는 AI 생성 시안(캐릭터 이미지 프롬프트 팩)이며 외주 납품본으로 교체한다. 해상도 137×240 은 PoC 용.
- iOS 검증 (iPhone 없음).

## 완료 조건

- [x] `pnpm unity:test` 에 분류 규칙·UV·키 파싱·슬롯 교체 테스트 통과.
- [x] 캐릭터 선택 → 통화 화면에서 선택한 캐릭터의 아틀라스가 로드된다 (`[SpriteAvatar] [remote] loaded sera`).
- [x] Android 에뮬레이터 통화 화면에 캐릭터 정면이 보인다.
- [ ] 실기기에서 웃음·입 벌림·찡그림이 각각 다른 칸으로 바뀐다 (폰 연결 후, docs/REMAINING_WORK.md 5~6).
