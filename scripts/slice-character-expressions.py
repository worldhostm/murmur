#!/usr/bin/env python3
"""신규 캐릭터 상반신 표정 세트(1999×668, 캐릭터 블록 5열 × 2행)에서 신규 10인의 Unity 아틀라스와 앱 초상을 만든다.

2026-11-12: 신규 10인은 출시 예정(coming-soon)으로 보류해 생성물을 저장소에서 지웠다. 출시할 때 이 스크립트를 돌리고
packages/shared-types/src/character.ts 의 availability 를 available 로 바꾼다.

블록 하나 = 이름 + 큰 상반신 1장 + 표정 상반신 8칸(윗줄 기본·미소·활짝 웃음·놀람, 아랫줄 화남·슬픔·당황·윙크).
표정 칸(테두리 안쪽 약 48×73)은 가로를 137 로 키워(약 2.9배) 상반신 전체를 넣고 위아래 짧은 띠는 어둡게 블러한 배경으로 채운다. 시트가
저해상도라 흐리다. 원본 해상도 시트가 오면 CELL/BUST 좌표만 다시 재고 돌린다.

표정 8칸 → SpriteExpression 10칸 매핑 (apps/avatar-unity/Assets/Murmur/Scripts/SpriteExpression.cs 순서):
  neutral←기본, softSmile←미소, smile←미소, bigSmile←활짝 웃음, serious←기본, surprised←놀람,
  flustered←당황, worried←슬픔, sad←슬픔, angry←화남. 윙크는 쓰지 않는다(분류기에 칸이 없다).

출력:
  apps/avatar-unity/Assets/Murmur/Resources/Characters/<id>.png  1024×512 아틀라스(137×240 셀 5×2) + 없으면 .meta
  apps/mobile/assets/characters/<id>.png                          137×240 초상(블록의 큰 상반신)
사용: python3 scripts/slice-character-expressions.py ~/Downloads/murmur_character_expressions_1112.png [--debug overlay.png]
"""
import argparse, os, re, uuid
from PIL import Image, ImageDraw, ImageFilter

# 블록 순서 (왼쪽 위 → 오른쪽, 그다음 아랫줄). packages/shared-types/src/character.ts 의 id 와 같다.
CHARACTER_IDS = [
    ["lee-junseo", "kai", "ha-jun", "noah", "jeon-yuhyeon"],
    ["yoon-arin", "ciel", "do-hayeon", "ji-yuna", "moka"],
]
SHEET_SIZE = (1999, 668)
BLOCK_X = [87, 468, 854, 1241, 1622]   # 블록 왼쪽 테두리
BLOCK_Y = [61, 350]                     # 블록 위 테두리
# 블록 왼쪽 위 기준 상대 좌표
BUST = (3, 49, 124, 273)                # 큰 상반신 (x0, y0, x1, y1). 오른쪽 칸 영역이 섞이지 않게 124 까지
CELL_X = [131, 195, 258, 322]           # 표정 칸 테두리 왼쪽
CELL_Y = [34, 149]                      # 표정 칸 테두리 위 (윗줄, 아랫줄)
CELL_W, CELL_H = 60, 83                 # 테두리 포함 칸 크기
INSET_X, INSET_Y = 6, 5                 # 테두리 선이 섞이지 않게 안쪽만 쓴다 (블록마다 격자가 ±4px 어긋나도 선이 안 들어오게 넉넉히)
BAND_DARK = 0.4                         # 위아래 띠 밝기 배율 (Unity 밤 배경에 가깝게)
FEATHER = 8                             # 상반신 위아래를 띠로 녹이는 픽셀 수
# 블록마다 칸 격자가 몇 px 씩 어긋나 있다. 칸 8개의 가장자리에 테두리 선(밝은 열/행)이 가장 덜 들어오는 (dx, dy) 를 ±8 범위에서 찾은 값.
BLOCK_OFFSETS = {
    "lee-junseo": (-4, 0), "kai": (-5, -5), "ha-jun": (-6, -2), "noah": (-1, 2), "jeon-yuhyeon": (-6, 1),
    "yoon-arin": (-2, -1), "ciel": (-7, 5), "do-hayeon": (-1, -6), "ji-yuna": (-5, 5), "moka": (-8, -3),
}
SHEET_CELLS = ["neutral", "softSmile", "bigSmile", "surprised", "angry", "sad", "flustered", "wink"]
ATLAS_ORDER = [  # SpriteExpression 순서대로 시트 칸 이름
    "neutral", "softSmile", "softSmile", "bigSmile", "neutral",
    "surprised", "flustered", "sad", "sad", "angry",
]
OUT_W, OUT_H = 137, 240
ATLAS_W, ATLAS_H, ATLAS_COLS = 1024, 512, 5
HERE = os.path.dirname(os.path.abspath(__file__))
ATLAS_DIR = os.path.join(HERE, "..", "apps/avatar-unity/Assets/Murmur/Resources/Characters")
PORTRAIT_DIR = os.path.join(HERE, "..", "apps/mobile/assets/characters")


def fit_cell(img):
    """표정 칸(약 48×73) → 137×240. 가로를 137 로 맞춰 상반신이 잘리지 않게 하고(높이 약 198), 위아래 남는 띠는 같은 칸을
    꽉 채우게 키워 블러·어둡게 한 배경으로 채운다. 얼굴 띠의 위아래 가장자리는 FEATHER px 에 걸쳐 배경으로 녹인다."""
    w, h = img.size
    body_h = round(h * OUT_W / w)
    body = img.resize((OUT_W, body_h), Image.LANCZOS)
    backdrop = img.resize((OUT_W, OUT_H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(12))
    canvas = backdrop.point(lambda v: int(v * BAND_DARK))
    top = (OUT_H - body_h) // 2
    mask = Image.new("L", (OUT_W, body_h), 255)
    for y in range(FEATHER):
        a = int(255 * (y + 1) / (FEATHER + 1))
        mask.paste(a, (0, y, OUT_W, y + 1))
        mask.paste(a, (0, body_h - 1 - y, OUT_W, body_h - y))
    canvas.paste(body, (0, top), mask)
    return canvas


def fit_portrait(img):
    """큰 상반신(약 121×224) → 137×240. 가로를 137 로 맞추고 아래쪽을 잘라 240 을 남긴다 (얼굴은 위쪽에 있다)."""
    w, h = img.size
    big = img.resize((OUT_W, max(OUT_H, round(h * OUT_W / w))), Image.LANCZOS)
    return big.crop((0, 0, OUT_W, OUT_H))


def block_boxes(bx, by, offset=(0, 0)):
    """블록의 큰 상반신 상자와 표정 칸 상자(이름→상자). offset 은 블록마다 다른 칸 격자의 어긋남(BLOCK_OFFSETS)."""
    bust = (bx + BUST[0], by + BUST[1], bx + BUST[2], by + BUST[3])
    dx, dy = offset
    cells = {}
    for r, cy in enumerate(CELL_Y):
        for c, cx in enumerate(CELL_X):
            x0, y0 = bx + cx + dx + INSET_X, by + cy + dy + INSET_Y
            cells[SHEET_CELLS[r * 4 + c]] = (x0, y0, x0 + CELL_W - 2 * INSET_X, y0 + CELL_H - 2 * INSET_Y)
    return bust, cells


def write_meta(png_path, template_path):
    meta_path = png_path + ".meta"
    if os.path.exists(meta_path) or not os.path.exists(template_path):
        return
    with open(template_path, encoding="utf-8") as f:
        meta = f.read()
    meta = re.sub(r"^guid: [0-9a-f]{32}$", f"guid: {uuid.uuid4().hex}", meta, count=1, flags=re.M)
    with open(meta_path, "w", encoding="utf-8") as f:
        f.write(meta)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--atlas-dir", default=ATLAS_DIR)
    ap.add_argument("--portrait-dir", default=PORTRAIT_DIR)
    ap.add_argument("--debug", help="자른 영역을 그린 확인용 이미지 경로. 지정하면 출력물은 만들지 않는다.")
    a = ap.parse_args()
    im = Image.open(a.sheet).convert("RGB")
    if im.size != SHEET_SIZE:
        raise SystemExit(f"{SHEET_SIZE} 시트를 기대했지만 {im.size} 이다. BLOCK_X/BLOCK_Y/BUST/CELL_* 를 다시 측정하라.")
    if a.debug:
        dbg = im.copy()
        d = ImageDraw.Draw(dbg)
        for row, by in zip(CHARACTER_IDS, BLOCK_Y):
            for cid, bx in zip(row, BLOCK_X):
                bust, cells = block_boxes(bx, by, BLOCK_OFFSETS[cid])
                d.rectangle(bust, outline=(0, 255, 0))
                for box in cells.values():
                    d.rectangle(box, outline=(255, 64, 64))
        dbg.save(a.debug)
        print(f"debug overlay -> {a.debug}")
        return
    os.makedirs(a.atlas_dir, exist_ok=True)
    os.makedirs(a.portrait_dir, exist_ok=True)
    template_meta = os.path.join(ATLAS_DIR, "sera.png.meta")  # 기존 아틀라스의 임포트 설정을 복사한다
    for row, by in zip(CHARACTER_IDS, BLOCK_Y):
        for cid, bx in zip(row, BLOCK_X):
            bust, cells = block_boxes(bx, by, BLOCK_OFFSETS[cid])
            portrait = fit_portrait(im.crop(bust))
            portrait.save(os.path.join(a.portrait_dir, f"{cid}.png"), optimize=True)
            atlas = Image.new("RGBA", (ATLAS_W, ATLAS_H), (0, 0, 0, 0))
            for i, name in enumerate(ATLAS_ORDER):
                cell = fit_cell(im.crop(cells[name]))
                atlas.paste(cell, ((i % ATLAS_COLS) * OUT_W, (i // ATLAS_COLS) * OUT_H))
            out = os.path.join(a.atlas_dir, f"{cid}.png")
            atlas.save(out, optimize=True)
            write_meta(out, template_meta)
            print(f"{cid}: atlas + portrait")


if __name__ == "__main__":
    main()
