"""Render the macOS app icon: a Basalt tile holding a Paper stone and a Signal streak.

Run:  python build_icon.py      (needs Pillow)
Writes files/build/icon-1024.png and files/build/icon.icns.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

INK = (22, 23, 26, 255)
SIGNAL = (232, 89, 12, 255)
PAPER = (245, 243, 238, 255)

# Same geometry as the mark (viewBox 0 0 120 100) and the streak the wordmark
# script aligns to the tt crossbar.
STONE = [(12, 12), (108, 12), (92, 88), (28, 88)]
STROKE = 16
STREAK = (26, 28.93, 58, 12.02)  # x, y, w, h

SS = 4            # supersampling factor
SIZE = 1024
BODY = 824        # Apple's macOS icon grid: 824 px tile, 100 px margin
RADIUS = 185
STONE_W = 470     # drawn stone width on the 1024 canvas

BUILD = Path(__file__).parent.parent / "files" / "build"


def render() -> Image.Image:
    n = SIZE * SS
    img = Image.new("RGBA", (n, n), (0, 0, 0, 0))

    # Soft drop shadow under the tile, as system icons have.
    shadow = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    off = (SIZE - BODY) // 2 * SS
    ImageDraw.Draw(shadow).rounded_rectangle(
        (off, off + 12 * SS, off + BODY * SS, off + BODY * SS + 12 * SS), RADIUS * SS, fill=(0, 0, 0, 90))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(14 * SS)))

    d = ImageDraw.Draw(img)
    d.rounded_rectangle((off, off, off + BODY * SS, off + BODY * SS), RADIUS * SS, fill=INK)

    # Stone: drawn box is 4..116 x 4..96 in mark units; centre it on the tile.
    k = STONE_W * SS / 112
    ox = n / 2 - 60 * k
    oy = n / 2 - 50 * k
    pts = [(ox + x * k, oy + y * k) for x, y in STONE]
    d.polygon(pts, fill=PAPER)
    r = STROKE / 2 * k
    for a, b in zip(pts, pts[1:] + pts[:1]):
        d.line([a, b], fill=PAPER, width=round(STROKE * k))
    for x, y in pts:  # round joins
        d.ellipse((x - r, y - r, x + r, y + r), fill=PAPER)

    sx, sy, sw, sh = STREAK
    d.rounded_rectangle((ox + sx * k, oy + sy * k, ox + (sx + sw) * k, oy + (sy + sh) * k), sh / 2 * k, fill=SIGNAL)
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    icon = render()
    icon.save(BUILD / "icon-1024.png")
    icon.save(BUILD / "icon.icns", sizes=[(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)])
    print(f"wrote {BUILD / 'icon-1024.png'} and icon.icns")


if __name__ == "__main__":
    main()
