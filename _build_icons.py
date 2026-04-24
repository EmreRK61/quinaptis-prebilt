"""Generate icons from the Quinaptis dark-mode Q source.

Centres on the alpha-weighted centroid (so the ring — which has most of
the pixel mass — sits at the visual centre) and reserves a generous 20%
safe margin so nothing clips under iOS's squircle mask.
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets')
SRC = os.path.join(OUT, '_q_source.png')

DARK_BG = (35, 31, 32, 255)  # same near-black as the source's background
PADDING_RATIO = 0.20         # iOS squircle safe zone


def content_centroid(img):
    """Return (cx, cy) weighted by white-ish pixel intensity.

    White pixels of the Q mark count as mass; the dark background counts
    as zero. The ring dominates the pixel count so its centre dominates
    the centroid — the Q-tail is too sparse to shift it much.
    """
    px = img.load()
    w, h = img.size
    total = 0
    sx = 0
    sy = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # weight proportional to brightness above the dark bg
            weight = max(0, r - 60)
            if weight > 0:
                total += weight
                sx += weight * x
                sy += weight * y
    if total == 0:
        return w / 2, h / 2
    return sx / total, sy / total


def centred_square(img, padding_ratio=PADDING_RATIO):
    """Place img on a square canvas so its centroid sits dead-centre."""
    cx, cy = content_centroid(img)
    w, h = img.size
    # Farthest distance from centroid to any edge of the content
    max_reach = max(cx, w - cx, cy, h - cy)
    side = int(max_reach * 2 / (1 - 2 * padding_ratio))
    canvas = Image.new('RGBA', (side, side), DARK_BG)
    # Paste so that (cx, cy) lands on canvas centre
    px = int(round(side / 2 - cx))
    py = int(round(side / 2 - cy))
    canvas.paste(img, (px, py))
    return canvas


def main():
    q = Image.open(SRC).convert('RGBA')
    square = centred_square(q)

    sizes = {
        'icon-16-v2.png': 16,
        'icon-32-v2.png': 32,
        'icon-180-v2.png': 180,
        'icon-192-v2.png': 192,
        'icon-512-v2.png': 512,
    }

    for name, sz in sizes.items():
        icon = square.resize((sz, sz), Image.LANCZOS).convert('RGB')
        icon.save(os.path.join(OUT, name))
        print(f'{name}: {sz}x{sz}')
    print('Done.')


if __name__ == '__main__':
    main()
