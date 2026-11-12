#!/usr/bin/env python3
"""Unity 아틀라스(Resources/Characters/<id>.png, 137×240 셀 5×2)의 첫 칸(기본 표정)을 잘라 앱 번들용 초상을 만든다.

출력: apps/mobile/assets/characters/<id>.png (137×240, 원본 픽셀 그대로).
scripts/slice-expression-sheet.py 로 아틀라스를 다시 만들면 이 스크립트도 다시 돌린다.

사용: python3 scripts/export-character-thumbnails.py
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..")
ATLAS_DIR = os.path.join(ROOT, "apps/avatar-unity/Assets/Murmur/Resources/Characters")
OUT_DIR = os.path.join(ROOT, "apps/mobile/assets/characters")
CHARACTER_IDS = [
    "seo-doyoon", "leon-hart", "han-seorin", "sera",
    # 신규 10인 (scripts/slice-character-roster.py)
    "lee-junseo", "kai", "ha-jun", "noah", "jeon-yuhyeon",
    "yoon-arin", "ciel", "do-hayeon", "ji-yuna", "moka",
]
CELL_W, CELL_H = 137, 240


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for cid in CHARACTER_IDS:
        atlas = Image.open(os.path.join(ATLAS_DIR, f"{cid}.png")).convert("RGB")
        cell = atlas.crop((0, 0, CELL_W, CELL_H))  # 첫 칸 = 기본(중립) 표정
        out = os.path.join(OUT_DIR, f"{cid}.png")
        cell.save(out, optimize=True)
        print(f"{out} {cell.size}")


if __name__ == "__main__":
    main()
