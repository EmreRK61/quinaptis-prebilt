"""Generate icons from the Quinaptis dark-mode Q source.

The source is already on a solid dark background (no transparency anywhere),
so we just centre-crop it into a square and scale to each icon size.
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets')
SRC = os.path.join(OUT, '_q_source.png')

DARK_BG = (35, 31, 32, 255)  # matches the source's background


def make_square(img, padding_ratio=0.12):
    """Pad the image to a square (with breathing room) in the source bg colour."""
    w, h = img.size
    content_side = max(w, h)
    # Extra margin so the logo doesn't touch the icon edges
    side = int(content_side / (1 - 2 * padding_ratio))
    canvas = Image.new('RGBA', (side, side), DARK_BG)
    canvas.paste(img, ((side - w) // 2, (side - h) // 2))
    return canvas


def main():
    q = Image.open(SRC).convert('RGBA')
    square = make_square(q)

    sizes = {
        'icon-16.png': 16,
        'icon-32.png': 32,
        'icon-180.png': 180,
        'icon-192.png': 192,
        'icon-512.png': 512,
    }

    for name, sz in sizes.items():
        icon = square.resize((sz, sz), Image.LANCZOS).convert('RGB')
        icon.save(os.path.join(OUT, name))
        print(f'{name}: {sz}x{sz}')
    print('Done.')


if __name__ == '__main__':
    main()
