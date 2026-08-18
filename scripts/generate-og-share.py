from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH, HEIGHT = 1200, 630
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-guardian-share.png"
FONT = r"C:\Windows\Fonts\malgun.ttf"
BOLD = r"C:\Windows\Fonts\malgunbd.ttf"

image = Image.new("RGB", (WIDTH, HEIGHT), "#f5f1e8")
pixels = image.load()
for y in range(HEIGHT):
    for x in range(WIDTH):
        glow = max(0, 1 - (((x - 945) / 600) ** 2 + ((y - 110) / 430) ** 2))
        pixels[x, y] = (245 - int(8 * glow), 241 + int(5 * glow), 232 - int(10 * glow))

layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
d = ImageDraw.Draw(layer)
for radius, color in (
    (260, (189, 210, 188, 80)),
    (185, (224, 192, 153, 70)),
    (105, (168, 194, 170, 70)),
):
    d.ellipse((970 - radius, 120 - radius, 970 + radius, 120 + radius), fill=color)
layer = layer.filter(ImageFilter.GaussianBlur(18))
image = Image.alpha_composite(image.convert("RGBA"), layer)
d = ImageDraw.Draw(image)

d.rounded_rectangle((42, 42, WIDTH - 42, HEIGHT - 42), 22, outline=(99, 128, 105, 70), width=2)
d.text((82, 76), "직장인마다 하나씩 있다는", font=ImageFont.truetype(FONT, 28), fill="#667069")
d.text((78, 137), "60마리 중", font=ImageFont.truetype(BOLD, 62), fill="#24342a")
d.text((78, 213), "내 수호신은 누구?", font=ImageFont.truetype(BOLD, 62), fill="#24342a")
d.text((82, 324), "태어난 날의 기운으로 만나는", font=ImageFont.truetype(FONT, 28), fill="#59645c")
d.text((82, 365), "나랑 꼭 닮은 직장생활 수호신", font=ImageFont.truetype(FONT, 28), fill="#59645c")

guardian_specs = [
    ("01.webp", (705, 215), 210, -8),
    ("14.webp", (850, 120), 235, 5),
    ("32.webp", (990, 245), 205, 9),
]
for filename, position, size, angle in guardian_specs:
    guardian = Image.open(ROOT / "public" / "guardians" / filename).convert("RGBA")
    guardian.thumbnail((size, size), Image.Resampling.LANCZOS)
    guardian = guardian.rotate(angle, expand=True, resample=Image.Resampling.BICUBIC)
    image.alpha_composite(guardian, position)

d = ImageDraw.Draw(image)
d.rounded_rectangle((82, 486, 337, 542), 28, fill="#6f8b75")
d.text((120, 498), "내 수호신 만나기", font=ImageFont.truetype(BOLD, 23), fill="#ffffff")
d.text((930, 548), "jobsaju.kr", font=ImageFont.truetype(FONT, 22), fill="#7c857f")
image.convert("RGB").save(OUT, "PNG", optimize=True)
