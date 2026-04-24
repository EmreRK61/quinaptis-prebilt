"""Generate PWA / apple-touch-icon PNGs for Quinaptis.

Draws a clean symmetric icon programmatically: navy disc + double gold
ring + white Q. This is the favicon/home-screen companion to the wide
brand logo — the wide logo's asymmetric tail can't be reliably cropped
into a square without clipping, so we render a purpose-built icon.
"""
from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets')

NAVY = (28, 61, 110, 255)       # #1C3D6E
GOLD = (181, 138, 46, 255)      # #B58A2E
WHITE = (255, 255, 255, 255)


def _font(size):
    for path in (
        r'C:\Windows\Fonts\segoeuib.ttf',   # Segoe UI Bold
        r'C:\Windows\Fonts\arialbd.ttf',    # Arial Bold
        r'C:\Windows\Fonts\calibrib.ttf',   # Calibri Bold
    ):
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make_icon(size):
    # Supersample for smooth edges on small sizes
    s = 4 if size < 256 else 2
    S = size * s
    canvas = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    # Navy filled disc — leaves a transparent margin so iOS rounded corners
    # never bite into the artwork.
    margin = int(S * 0.08)
    draw.ellipse([margin, margin, S - margin - 1, S - margin - 1], fill=NAVY)

    # Outer gold ring
    thick_outer = max(2, S // 24)
    inset_outer = margin + max(2, S // 28)
    draw.ellipse(
        [inset_outer, inset_outer, S - inset_outer - 1, S - inset_outer - 1],
        outline=GOLD,
        width=thick_outer,
    )

    # Inner gold ring (second, thinner ring)
    thick_inner = max(2, S // 36)
    inset_inner = inset_outer + thick_outer + max(2, S // 40)
    draw.ellipse(
        [inset_inner, inset_inner, S - inset_inner - 1, S - inset_inner - 1],
        outline=GOLD,
        width=thick_inner,
    )

    # White "Q" centred within the inner ring
    target_h = int(S * 0.48)
    font = _font(target_h)
    try:
        bbox = draw.textbbox((0, 0), 'Q', font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        tx = (S - tw) // 2 - bbox[0]
        ty = (S - th) // 2 - bbox[1]
    except AttributeError:
        tw, th = draw.textsize('Q', font=font)
        tx = (S - tw) // 2
        ty = (S - th) // 2
    ty -= max(1, S // 50)
    draw.text((tx, ty), 'Q', font=font, fill=WHITE)

    return canvas.resize((size, size), Image.LANCZOS)


def main():
    sizes = {
        'icon-16.png': 16,
        'icon-32.png': 32,
        'icon-180.png': 180,
        'icon-192.png': 192,
        'icon-512.png': 512,
    }
    for name, sz in sizes.items():
        icon = make_icon(sz)
        icon.save(os.path.join(OUT, name))
        print(f'{name}: {sz}x{sz}')
    print('Done.')


if __name__ == '__main__':
    main()
