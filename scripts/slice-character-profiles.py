#!/usr/bin/env python3
"""신규 캐릭터 프로필 시트(998×279, 카드 5열 × 2행, 카드 왼쪽에 상반신 1포즈)에서 신규 10인의 앱 초상을 만든다.

로스터 시트(scripts/slice-character-roster.py)의 셀은 가로형이라 레터박스가 생기지만, 이 시트의 상반신은 세로형이라
137×240 초상을 레터박스 없이 꽉 채울 수 있다. 표정은 1포즈뿐이므로 Unity 아틀라스(표정 10칸)는 로스터 시트에서 계속 만들고,
이 스크립트는 RN 화면(목록 카드·온보딩 히어로·채팅 상단 이름표)이 쓰는 초상만 바꾼다.

얼굴이 캔버스 위쪽 1/3 에 오도록 상반신의 아래쪽 일부(BUST_KEEP 비율 아래)는 버린다. 채팅 상단의 원형 썸네일은
초상의 가운데 정사각형(세로 21~79%)을 보여 주므로 얼굴이 그 안에 들어와야 한다.

출력: apps/mobile/assets/characters/<id>.png (137×240)
사용: python3 scripts/slice-character-profiles.py ~/Downloads/murmur_character_profiles_1112.png
"""
import argparse, os
from PIL import Image

# 카드 순서 (왼쪽 위 → 오른쪽, 그다음 아랫줄). packages/shared-types/src/character.ts 의 id 와 같다.
CHARACTER_IDS = [
    ["lee-junseo", "kai", "ha-jun", "noah", "jeon-yuhyeon"],
    ["yoon-arin", "ciel", "do-hayeon", "ji-yuna", "moka"],
]
# 시트에서 측정한 카드 왼쪽 경계(x)와 행의 위·아래(y). 카드 왼쪽 약 90px 이 상반신이다.
CARD_X = [64, 251, 440, 626, 809]
ROW_Y = [(15, 140), (146, 275)]
BUST_W = 90
INSET = 3          # 카드 테두리가 섞이지 않게 안쪽만 쓴다
BUST_KEEP = 0.88   # 상반신 높이 중 위에서부터 이 비율만 쓴다 (얼굴을 위로 올린다)
OUT_W, OUT_H = 137, 240
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "apps/mobile/assets/characters")


def fit_cover(bust):
    """상반신 → 137×240. 높이를 240 으로 키우고 가로 가운데 137 을 남긴다 (레터박스 없음)."""
    w, h = bust.size
    scale = OUT_H / h
    big = bust.resize((max(OUT_W, round(w * scale)), OUT_H), Image.LANCZOS)
    left = (big.width - OUT_W) // 2
    return big.crop((left, 0, left + OUT_W, OUT_H))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--out", default=OUT_DIR)
    a = ap.parse_args()
    im = Image.open(a.sheet).convert("RGB")
    if im.size != (998, 279):
        raise SystemExit(f"998×279 시트를 기대했지만 {im.size} 이다. CARD_X/ROW_Y 를 다시 측정하라.")
    os.makedirs(a.out, exist_ok=True)
    for row, (y0, y1) in zip(CHARACTER_IDS, ROW_Y):
        for cid, x0 in zip(row, CARD_X):
            top, bottom = y0 + INSET, y1 - INSET
            keep_bottom = top + round((bottom - top) * BUST_KEEP)
            bust = im.crop((x0 + INSET, top, x0 + BUST_W, keep_bottom))
            out = os.path.join(a.out, f"{cid}.png")
            fit_cover(bust).save(out, optimize=True)
            print(f"{cid}: bust {bust.size} -> {out}")


if __name__ == "__main__":
    main()
