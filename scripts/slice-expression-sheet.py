#!/usr/bin/env python3
"""표정 시트(캐릭터 4행 × 표정 10열 PNG)를 캐릭터별 아틀라스로 자른다.

입력: 1536×1024 시트. 첫 행(y<65)은 표정 이름, 첫 열(x<160)은 캐릭터 이름. 셀은 약 137×240.
출력: apps/avatar-unity/Assets/Murmur/Resources/Characters/<id>.png — 1024×512 아틀라스, 셀 137×240 을
      5열 × 2행으로 배치 (표정 i → col=i%5, row=i//5, 원본 픽셀 그대로, 리샘플링 없음).
표정 순서(시트 열 순서) = SpriteExpression enum 순서: 기본, 미소(은은), 미소(살짝), 활짝 웃음, 진지, 놀람, 당황, 걱정, 슬픔, 화남.

사용: python3 scripts/slice-expression-sheet.py <sheet.png> [--x0 160 --y0 65 --cols 10 --rows 4]
"""
import argparse, os, sys
from PIL import Image

CHARACTER_IDS = ["seo-doyoon", "leon-hart", "han-seorin", "sera"]  # 시트 행 순서
ATLAS_W, ATLAS_H = 1024, 512
CELL_W, CELL_H = 137, 240
ATLAS_COLS = 5
INSET = 3  # 구분선·이웃 셀이 섞이지 않게 셀 안쪽만 쓴다

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--x0", type=float, default=160)
    ap.add_argument("--y0", type=float, default=65)
    ap.add_argument("--cols", type=int, default=10)
    ap.add_argument("--rows", type=int, default=4)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "apps/avatar-unity/Assets/Murmur/Resources/Characters"))
    a = ap.parse_args()
    im = Image.open(a.sheet).convert("RGB")
    W, H = im.size
    col_w = (W - a.x0) / a.cols
    row_h = (H - a.y0) / a.rows
    os.makedirs(a.out, exist_ok=True)
    for r, cid in enumerate(CHARACTER_IDS[: a.rows]):
        atlas = Image.new("RGB", (ATLAS_W, ATLAS_H), (0, 0, 0))
        for i in range(a.cols):
            x = int(round(a.x0 + i * col_w)) + INSET
            y = int(round(a.y0 + r * row_h)) + INSET
            cell = im.crop((x, y, x + CELL_W - 2 * INSET, y + CELL_H - 2 * INSET)).resize((CELL_W, CELL_H), Image.LANCZOS)
            ax, ay = (i % ATLAS_COLS) * CELL_W, (i // ATLAS_COLS) * CELL_H
            atlas.paste(cell, (ax, ay))
        path = os.path.join(a.out, cid + ".png")
        atlas.save(path, optimize=True)
        print("wrote", path)

if __name__ == "__main__":
    main()
