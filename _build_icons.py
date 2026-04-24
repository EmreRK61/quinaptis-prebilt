"""Generate PWA / apple-touch-icon PNGs from the authentic Quinaptis Q logo.

Uses the cropped Q mark from the main logo (navy Q inside double gold ring)
on a transparent background. Centres on the alpha-weighted centroid so the
ring sits in the visual middle of the icon — otherwise the asymmetric tail
pulls the whole mark off to one side once iOS rounds the corners.
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_LOGO = os.path.join(HERE, 'assets', 'quinaptis-logo.png')
SRC_Q = os.path.join(HERE, 'assets', '_q_source.png')
OUT = os.path.join(HERE, 'assets')


def load_q():
    """Prefer the pre-extracted Q; else crop it from the full logo."""
    if os.path.exists(SRC_Q):
        q = Image.open(SRC_Q).convert('RGBA')
    else:
        logo = Image.open(SRC_LOGO).convert('RGBA')
        w, h = logo.size
        q = logo.crop((0, 0, min(500, w), int(h * 0.80)))
    bbox = q.getbbox()
    if bbox:
        q = q.crop(bbox)
    return q


def alpha_centroid(img):
    """Return (cx, cy) = centroid of opacity — biased toward the dense ring."""
    alpha = img.split()[-1]
    w, h = img.size
    total = 0
    sx = 0
    sy = 0
    pixels = alpha.load()
    for y in range(h):
        for x in range(w):
            a = pixels[x, y]
            if a > 0:
                total += a
                sx += a * x
                sy += a * y
    if total == 0:
        return w / 2, h / 2
    return sx / total, sy / total


def make_icon(q, cx, cy, size, padding_ratio=0.22):
    """Paste q on transparent canvas with (cx, cy) aligned to canvas centre."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    qw, qh = q.size
    # Scale so the longer of (distance from centroid to each edge) fits within
    # the safe area on both sides. Worst-case span dominates.
    inner_half = (size * (1 - 2 * padding_ratio)) / 2
    max_reach = max(cx, qw - cx, cy, qh - cy)
    scale = inner_half / max_reach
    new_w = max(1, int(qw * scale))
    new_h = max(1, int(qh * scale))
    q_resized = q.resize((new_w, new_h), Image.LANCZOS)
    # New centroid in the resized image
    cx_r = cx * scale
    cy_r = cy * scale
    # Paste so that centroid lands on canvas centre
    px = int(round(size / 2 - cx_r))
    py = int(round(size / 2 - cy_r))
    canvas.paste(q_resized, (px, py), q_resized)
    return canvas


def main():
    q = load_q()
    q.save(os.path.join(OUT, '_q_source.png'))
    cx, cy = alpha_centroid(q)

    sizes = {
        'icon-16.png': 16,
        'icon-32.png': 32,
        'icon-180.png': 180,
        'icon-192.png': 192,
        'icon-512.png': 512,
    }
    for name, sz in sizes.items():
        # More safe area for apple-touch-icon sizes (iOS rounded corners)
        if sz >= 180:
            pad = 0.18
        elif sz >= 64:
            pad = 0.08
        else:
            pad = 0.02
        icon = make_icon(q, cx, cy, sz, padding_ratio=pad)
        icon.save(os.path.join(OUT, name))
        print(f'{name}: {sz}x{sz}')
    print('Done.')


if __name__ == '__main__':
    main()
