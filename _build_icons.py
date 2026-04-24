"""Generate PWA / apple-touch-icon PNGs from the Quinaptis Q logo.

The source logo has an asymmetric Q-tail that clips under iOS's rounded
corners no matter how much padding you add. We crop the source to the
outer gold ring (a perfect circle) so the icon is symmetric and never
gets clipped — the tail is removed, which keeps the brand-identifying
double-ring + Q letter fully intact.
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_LOGO = os.path.join(HERE, 'assets', 'quinaptis-logo.png')
SRC_Q = os.path.join(HERE, 'assets', '_q_source.png')
OUT = os.path.join(HERE, 'assets')

GOLD_RGB = (181, 138, 46)  # #B58A2E — outer ring colour


def load_q():
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


def is_gold(rgba, tol=40):
    r, g, b, a = rgba
    if a < 100:
        return False
    gr, gg, gb = GOLD_RGB
    return abs(r - gr) < tol and abs(g - gg) < tol and abs(b - gb) < tol


def find_ring_circle(img):
    """Find the outer gold ring's bounding square (ignoring the Q-tail).

    Uses the vertical extent (top/bottom gold pixels) as the ring diameter
    since the tail extends horizontally but not vertically beyond the ring.
    Returns (cx, cy, radius).
    """
    w, h = img.size
    px = img.load()
    top = None
    bottom = None
    for y in range(h):
        for x in range(w):
            if is_gold(px[x, y]):
                if top is None:
                    top = y
                bottom = y
                break
    if top is None:
        # Fallback: use whole image
        return w / 2, h / 2, min(w, h) / 2
    radius = (bottom - top) / 2
    cy = (top + bottom) / 2
    # Ring is circular → horizontal centre equals vertical-slice centre where ring is widest.
    mid_y = int(cy)
    left = None
    right = None
    for x in range(w):
        if is_gold(px[x, mid_y]):
            if left is None:
                left = x
            right = x
    if left is None or right is None:
        cx = w / 2
    else:
        cx = (left + right) / 2
    return cx, cy, radius


def crop_to_ring(q):
    """Return a square image with a circular mask applied at the ring.

    Tail pixels outside the gold ring's circle are wiped to transparent,
    giving a perfectly symmetric circular icon.
    """
    from PIL import ImageDraw
    cx, cy, r = find_ring_circle(q)
    # Mask exactly at the outer ring radius (tiny margin)
    r_out = r * 1.01
    side = int(r_out * 2)
    half = side // 2
    left = int(cx - half)
    top = int(cy - half)
    right = left + side
    bottom = top + side
    # Crop area around the ring
    crop = q.crop((left, top, right, bottom))
    # Build a circular mask at high resolution, downsample for smooth edge
    s = 4
    mask = Image.new('L', (side * s, side * s), 0)
    ImageDraw.Draw(mask).ellipse(
        (0, 0, side * s - 1, side * s - 1), fill=255
    )
    mask = mask.resize((side, side), Image.LANCZOS)
    result = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    result.paste(crop, (0, 0), mask)
    return result


def make_icon(symmetric_q, size, padding_ratio=0.10):
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = int(size * (1 - 2 * padding_ratio))
    qw, qh = symmetric_q.size
    scale = min(inner / qw, inner / qh)
    new_w = max(1, int(qw * scale))
    new_h = max(1, int(qh * scale))
    q_resized = symmetric_q.resize((new_w, new_h), Image.LANCZOS)
    px = (size - new_w) // 2
    py = (size - new_h) // 2
    canvas.paste(q_resized, (px, py), q_resized)
    return canvas


def main():
    q = load_q()
    sym = crop_to_ring(q)
    sym.save(os.path.join(OUT, '_q_source.png'))

    sizes = {
        'icon-16.png': 16,
        'icon-32.png': 32,
        'icon-180.png': 180,
        'icon-192.png': 192,
        'icon-512.png': 512,
    }
    for name, sz in sizes.items():
        # Circular mask handles any leftover asymmetry, so padding can be
        # small — we just want a hair of breathing room.
        pad = 0.02 if sz >= 180 else 0.0
        icon = make_icon(sym, sz, padding_ratio=pad)
        icon.save(os.path.join(OUT, name))
        print(f'{name}: {sz}x{sz}')
    print('Done.')


if __name__ == '__main__':
    main()
