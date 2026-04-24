"""Generate PWA / apple-touch-icon PNGs from the authentic Quinaptis Q logo.

Uses the cropped Q mark from the main logo (navy Q inside double gold ring)
on a transparent background — matches the brand identity.
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


def make_icon(q, size, padding_ratio=0.06):
    """Paste the Q mark onto a transparent canvas of the target size."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    inner = int(size * (1 - 2 * padding_ratio))
    qw, qh = q.size
    scale = min(inner / qw, inner / qh)
    new_w = max(1, int(qw * scale))
    new_h = max(1, int(qh * scale))
    q_resized = q.resize((new_w, new_h), Image.LANCZOS)
    px = (size - new_w) // 2
    py = (size - new_h) // 2
    canvas.paste(q_resized, (px, py), q_resized)
    return canvas


def main():
    q = load_q()
    q.save(os.path.join(OUT, '_q_source.png'))

    sizes = {
        'icon-16.png': 16,
        'icon-32.png': 32,
        'icon-180.png': 180,
        'icon-192.png': 192,
        'icon-512.png': 512,
    }
    for name, sz in sizes.items():
        # apple-touch-icon sizes get iOS rounded corners, so reserve a
        # larger safe area (~15%) so the Q's tail and gold ring don't clip.
        # Tiny favicons (16/32) use minimal padding so the mark stays legible.
        if sz >= 180:
            pad = 0.15
        elif sz >= 64:
            pad = 0.08
        else:
            pad = 0.02
        icon = make_icon(q, sz, padding_ratio=pad)
        icon.save(os.path.join(OUT, name))
        print(f'{name}: {sz}x{sz}')
    print('Done.')


if __name__ == '__main__':
    main()
