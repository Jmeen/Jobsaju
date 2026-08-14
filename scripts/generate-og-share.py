from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH, HEIGHT = 1200, 630
OUT = r"C:\GoogleDrive\job_saju_codex_handoff\public\og-share.png"
FONT = r"C:\Windows\Fonts\malgun.ttf"
BOLD = r"C:\Windows\Fonts\malgunbd.ttf"

image = Image.new("RGB", (WIDTH, HEIGHT), "#110c1c")
pixels = image.load()
for y in range(HEIGHT):
    for x in range(WIDTH):
        glow = max(0, 1 - (((x - 980) / 520) ** 2 + ((y - 95) / 360) ** 2))
        pixels[x, y] = (17 + int(31 * glow), 12 + int(12 * glow), 28 + int(48 * glow))

layer = Image.new("RGBA", image.size, (0, 0, 0, 0))
d = ImageDraw.Draw(layer)
for radius, color in ((230, (56, 24, 82, 150)), (155, (72, 31, 104, 150)), (82, (92, 40, 130, 155))):
    d.ellipse((980 - radius, 105 - radius, 980 + radius, 105 + radius), fill=color)
layer = layer.filter(ImageFilter.GaussianBlur(1.2))
image = Image.alpha_composite(image.convert("RGBA"), layer)
d = ImageDraw.Draw(image)

d.rounded_rectangle((42, 42, WIDTH - 42, HEIGHT - 42), 10, outline=(192, 132, 252, 82), width=2)
d.text((88, 84), "직장인 이직사주", font=ImageFont.truetype(FONT, 27), fill="#cbb8df")
d.text((88, 172), "올해, 이직해도 될까?", font=ImageFont.truetype(BOLD, 62), fill="#f8f5fb")
d.text((88, 275), "내 이직 적기는", font=ImageFont.truetype(BOLD, 42), fill="#eee7f3")
d.text((88, 338), "○월부터 시작됩니다", font=ImageFont.truetype(BOLD, 54), fill="#d7a5ff")

for index, width in enumerate((490, 430, 315)):
    y = 445 + index * 34
    d.rounded_rectangle((90, y, 90 + width, y + 13), 7, fill=(220, 205, 232, 47))

d.text((860, 547), "무료 점수 먼저 확인하기", font=ImageFont.truetype(FONT, 23), fill="#b9afc0")
image.convert("RGB").save(OUT, "PNG", optimize=True)
