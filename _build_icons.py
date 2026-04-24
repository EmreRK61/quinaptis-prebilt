"""Generate favicons/apple-touch-icons from s60 (the Quinaptis Q artwork).

Take _q_source.png (= s60), trim transparent borders, centre on a square
canvas with enough padding so it renders cleanly at every size.
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets')
SRC = os.path.join(OUT, '_q_source.png')


def main():
    q = Image.open(SRC).convert('RGBA')
    bbox = q.getbbox()
    if bbox:
        q = q.crop(bbox)

    sizes = {
        'icon-16.png': 16,
        'icon-32.png': 32,
        'icon-180.png': 180,
        'icon-192.png': 192,
        'icon-512.png': 512,
    }

    for name, sz in sizes.items():
        # iOS squircles its apple-touch-icons, so leave room.
        pad = 0.15 if sz >= 180 else 0.05
        canvas = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
        inner = int(sz * (1 - 2 * pad))
        qw, qh = q.size
        scale = min(inner / qw, inner / qh)
        nw = max(1, int(qw * scale))
        nh = max(1, int(qh * scale))
        resized = q.resize((nw, nh), Image.LANCZOS)
        px = (sz - nw) // 2
        py = (sz - nh) // 2
        canvas.paste(resized, (px, py), resized)
        canvas.save(os.path.join(OUT, name))
        print(f'{name}: {sz}x{sz}')
    print('Done.')


if __name__ == '__main__':
    main()
