"""Generate favicons/apple-touch-icons from s60 on a solid white canvas.

Centres the Quinaptis Q artwork on a white square so iOS doesn't render
the transparent areas as its own default dark chrome.
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets')
SRC = os.path.join(OUT, '_q_source.png')

WHITE = (255, 255, 255, 255)


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
        pad = 0.12 if sz >= 180 else 0.05
        # Build transparent overlay and composite over solid white background
        white_bg = Image.new('RGBA', (sz, sz), WHITE)
        overlay = Image.new('RGBA', (sz, sz), (0, 0, 0, 0))
        inner = int(sz * (1 - 2 * pad))
        qw, qh = q.size
        scale = min(inner / qw, inner / qh)
        nw = max(1, int(qw * scale))
        nh = max(1, int(qh * scale))
        resized = q.resize((nw, nh), Image.LANCZOS)
        px = (sz - nw) // 2
        py = (sz - nh) // 2
        overlay.paste(resized, (px, py), resized)
        final = Image.alpha_composite(white_bg, overlay).convert('RGB')
        final.save(os.path.join(OUT, name))
        print(f'{name}: {sz}x{sz}')
    print('Done.')


if __name__ == '__main__':
    main()
