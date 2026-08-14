"""
design-assets/creature-concepts의 원본 일러스트(1254x1254 PNG, 1.5~2.5MB)를
public/creatures/{slug}.webp (640x640, ~80~150KB)로 리사이즈·변환한다.

일간(천간) 10종 각각에 대응하는 '콜렉팅 크리처' 이미지 세트.
재생성: python scripts/optimize_creatures.py
"""
from PIL import Image
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "design-assets" / "creature-concepts"
OUT_DIR = ROOT / "public" / "creatures"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# 일간 -> 원본 파일 접두어 (characterAssets.ts의 슬러그와 일치시켜 둔다)
SLUGS = [
    "gap-wood", "eul-wood", "byeong-fire", "jeong-fire", "mu-earth",
    "gi-earth", "gyeong-metal", "sin-metal", "im-water", "gye-water",
]

TARGET_SIZE = 640
QUALITY = 82

for slug in SLUGS:
    src = SRC_DIR / f"{slug}-flat-2d-v1.png"
    if not src.exists():
        print(f"[skip] 원본 없음: {src.name}")
        continue
    img = Image.open(src).convert("RGB")
    img = img.resize((TARGET_SIZE, TARGET_SIZE), Image.LANCZOS)
    out = OUT_DIR / f"{slug}.webp"
    img.save(out, "WEBP", quality=QUALITY, method=6)
    print(f"{slug}: {src.stat().st_size // 1024}KB -> {out.stat().st_size // 1024}KB")
