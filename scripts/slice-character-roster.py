#!/usr/bin/env python3
"""신규 캐릭터 로스터 시트(기존 4행 + 신규 10행 × 표정 10열, 1536×1024)에서 신규 10인의 아틀라스를 만든다.

기존 4인은 scripts/slice-expression-sheet.py 가 만든 아틀라스를 그대로 쓴다 (이 시트의 상단 4행은 그 시안의 축소본이다).
신규 10행의 셀은 약 110×64 가로형이고 격자 간격이 고르지 않아, 측정한 구분선 좌표(X_EDGES/Y_EDGES)로 자른다.
137×240 세로 규격에 맞추기 위해 셀 높이를 FACE_H 로 키운 뒤 가로 중앙 137 을 남기고 위아래는 셀 배경색으로 채운다(레터박스).
해상도가 낮은 PoC 자산이며, 외주 원화가 오면 통째로 교체한다.

출력: apps/avatar-unity/Assets/Murmur/Resources/Characters/<id>.png — 1024×512 아틀라스, 137×240 셀 5열 × 2행
      (표정 i → col=i%5, row=i//5). 표정 순서 = SpriteExpression 순서(기본, 미소 2단계, 활짝 웃음, 진지, 놀람, 당황, 걱정, 슬픔, 화남).
      새 아틀라스에는 Unity .meta 를 같이 만든다(기존 sera.png.meta 의 임포트 설정, GUID 만 새로).

사용: python3 scripts/slice-character-roster.py ~/Downloads/murmur_character_roster_1112.png
      이후 python3 scripts/export-character-thumbnails.py 로 앱 초상을 다시 만든다.
"""
import argparse, os, re, uuid
from PIL import Image, ImageFilter

# 시트 신규 영역의 행 순서 (packages/shared-types/src/character.ts 의 id 와 같다)
NEW_CHARACTER_IDS = [
    "lee-junseo", "kai", "ha-jun", "noah", "jeon-yuhyeon",
    "yoon-arin", "ciel", "do-hayeon", "ji-yuna", "moka",
]
# 시트에서 측정한 셀 경계 (밝은 구분선 위치). 열 11개 경계 = 10열, 행 11개 경계 = 10행.
X_EDGES = [416, 531, 649, 765, 881, 1002, 1120, 1232, 1341, 1444, 1536]
Y_EDGES = [366, 430, 491, 551, 612, 675, 737, 799, 861, 927, 1008]
ATLAS_W, ATLAS_H = 1024, 512
CELL_W, CELL_H = 137, 240
ATLAS_COLS = 5
INSET = 3       # 구분선이 섞이지 않게 셀 안쪽만 쓴다
FACE_H = 112    # 셀 높이를 이 높이로 키운다 (약 1.75배). 더 키우면 흐려진다.
HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "apps/avatar-unity/Assets/Murmur/Resources/Characters")


def background_color(cell):
    """셀 모서리 네 곳의 평균색. 레터박스 띠 색으로 쓴다."""
    w, h = cell.size
    px = [cell.getpixel((x, y)) for x in (1, w - 2) for y in (1, h - 2)]
    return tuple(sum(c[i] for c in px) // len(px) for i in range(3))


def fit_portrait(cell):
    """가로형 셀 → 137×240. 높이를 FACE_H 로 키우고 가로 중앙 137 을 남긴다.
    위아래 띠는 단색 대신 같은 셀을 꽉 채우게 키워 블러·어둡게 한 배경으로 채운다 (얼굴 띠가 떠 보이지 않게)."""
    w, h = cell.size
    scale = FACE_H / h
    big = cell.resize((max(1, round(w * scale)), FACE_H), Image.LANCZOS)
    cover = max(CELL_W / w, CELL_H / h)
    backdrop = cell.resize((max(CELL_W, round(w * cover)), max(CELL_H, round(h * cover))), Image.LANCZOS)
    bx, by = (backdrop.width - CELL_W) // 2, (backdrop.height - CELL_H) // 2
    backdrop = backdrop.crop((bx, by, bx + CELL_W, by + CELL_H)).filter(ImageFilter.GaussianBlur(14))
    canvas = Image.blend(backdrop, Image.new("RGB", (CELL_W, CELL_H), background_color(cell)), 0.45)
    if big.width >= CELL_W:
        left = (big.width - CELL_W) // 2
        face = big.crop((left, 0, left + CELL_W, FACE_H))
        canvas.paste(face, (0, (CELL_H - FACE_H) // 2))
    else:
        canvas.paste(big, ((CELL_W - big.width) // 2, (CELL_H - FACE_H) // 2))
    return canvas


def write_meta(png_path, template_path):
    meta_path = png_path + ".meta"
    if os.path.exists(meta_path):
        return
    with open(template_path, encoding="utf-8") as f:
        meta = f.read()
    meta = re.sub(r"^guid: [0-9a-f]{32}$", f"guid: {uuid.uuid4().hex}", meta, count=1, flags=re.M)
    with open(meta_path, "w", encoding="utf-8") as f:
        f.write(meta)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("--out", default=OUT_DIR)
    a = ap.parse_args()
    im = Image.open(a.sheet).convert("RGB")
    if im.size != (1536, 1024):
        raise SystemExit(f"1536×1024 시트를 기대했지만 {im.size} 이다. X_EDGES/Y_EDGES 를 다시 측정하라.")
    os.makedirs(a.out, exist_ok=True)
    template_meta = os.path.join(a.out, "sera.png.meta")
    for r, cid in enumerate(NEW_CHARACTER_IDS):
        atlas = Image.new("RGB", (ATLAS_W, ATLAS_H), (0, 0, 0))
        for i in range(10):
            box = (X_EDGES[i] + INSET, Y_EDGES[r] + INSET, X_EDGES[i + 1] - INSET, Y_EDGES[r + 1] - INSET)
            ax, ay = (i % ATLAS_COLS) * CELL_W, (i // ATLAS_COLS) * CELL_H
            atlas.paste(fit_portrait(im.crop(box)), (ax, ay))
        path = os.path.join(a.out, cid + ".png")
        atlas.save(path, optimize=True)
        write_meta(path, template_meta)
        print("wrote", path)


if __name__ == "__main__":
    main()
