"""Create lightweight delivery assets from the source character PNGs."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIRS = [ROOT / "public" / "characters", ROOT / "design-assets" / "characters"]
OUTPUT_DIR = ROOT / "public" / "characters" / "optimized"


def main() -> None:
    source_dir = next((path for path in SOURCE_DIRS if list(path.glob("*.png"))), None)
    if source_dir is None:
        raise FileNotFoundError("캐릭터 PNG 원본을 찾지 못했습니다.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for source_path in sorted(source_dir.glob("*.png")):
        output_path = OUTPUT_DIR / f"{source_path.stem}.webp"
        with Image.open(source_path) as source:
            image = source.convert("RGB")
            image.thumbnail((640, 640), Image.Resampling.LANCZOS)
            image.save(output_path, "WEBP", quality=82, method=6)
        print(f"{source_path.name} -> {output_path.name} ({output_path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
