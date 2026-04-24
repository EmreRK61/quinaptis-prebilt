"""Build apple-touch-icons from s60.png following iOS specs.

- Replaces s60's gray/white checker background with solid black.
- Centres optically on the gold RING's bounding box (ignoring the
  asymmetric navy Q-tail), so the visual weight sits in the middle
  even though the letter-Q is not symmetric.
- Keeps a ~10% safety zone around the edges for iOS's squircle mask.
- Exports 152/167/180/192 as apple-touch-icon-*.png, plus 32 favicon
  and 512 for the PWA manifest (maskable).
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets')
SRC = 'C:/PreBilt/Prebilt new demo/s60.png'

BLACK = (0, 0, 0, 255)
SAFETY_RATIO = 0.10  # fraction of canvas reserved as safe margin each side


def clean_bg(img):
    """Replace the gray/white checker bg with solid black; keep logo colours."""
    img = img.convert('RGBA')
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # Checker bg: R≈G≈B AND all channels are light (> 200).
            if r > 200 and g > 200 and b > 200 \
               and abs(r - g) < 20 and abs(g - b) < 20 and abs(r - b) < 20:
                px[x, y] = BLACK
    return img


def gold_ring_bbox(img):
    """Bounding box of the gold ring — the shape's optical anchor.

    Gold in s60 clusters around (180, 140, 40): warm, R > G > B,
    R substantially larger than B.
    """
    px = img.load()
    w, h = img.size
    left, top, right, bottom = w, h, 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b, _ = px[x, y]
            if r > 130 and g > 90 and b < 100 and r > b + 40:
                found = True
                if x < left: left = x
                if x > right: right = x
                if y < top: top = y
                if y > bottom: bottom = y
    if not found:
        return (0, 0, w, h)
    return (left, top, right + 1, bottom + 1)


def build_icon(cleaned, ring_bbox, size):
    """Place the cleaned logo onto a size×size black canvas, centring the
    ring bbox and leaving a 10% safety margin around the icon edges.
    """
    left, top, right, bottom = ring_bbox
    ring_cx = (left + right) / 2
    ring_cy = (top + bottom) / 2
    # Ensure the cleaned image extends the same in every direction from ring
    # centre; the Q-tail may reach further bottom-right than the ring.
    w, h = cleaned.size
    # Half-extent the ring bbox covers (scaled so both axes fit)
    half_ring = max(right - ring_cx, ring_cx - left, bottom - ring_cy, ring_cy - top)
    # Safety-zone aware target: ring diameter should be ~80% of icon
    target_half = (size / 2) * (1 - SAFETY_RATIO)
    scale = target_half / half_ring

    # Resize the whole cleaned image by `scale`
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))
    resized = cleaned.resize((new_w, new_h), Image.LANCZOS)
    new_cx = ring_cx * scale
    new_cy = ring_cy * scale

    canvas = Image.new('RGBA', (size, size), BLACK)
    paste_x = int(round(size / 2 - new_cx))
    paste_y = int(round(size / 2 - new_cy))
    canvas.paste(resized, (paste_x, paste_y), resized)
    return canvas.convert('RGB')


def main():
    src = Image.open(SRC)
    cleaned = clean_bg(src)
    # Save intermediate debug copy
    cleaned.save(os.path.join(OUT, '_q_source.png'))
    ring = gold_ring_bbox(cleaned)
    print('Gold ring bbox:', ring)

    outputs = {
        'favicon-32.png': 32,
        'apple-touch-icon-152.png': 152,
        'apple-touch-icon-167.png': 167,
        'apple-touch-icon.png': 180,         # primary
        'apple-touch-icon-192.png': 192,
        'apple-touch-icon-512.png': 512,
    }
    for name, sz in outputs.items():
        icon = build_icon(cleaned, ring, sz)
        icon.save(os.path.join(OUT, name))
        print(f'{name}: {sz}x{sz}')

    # Squircle preview for sanity check
    preview_squircle(os.path.join(OUT, 'apple-touch-icon.png'),
                     os.path.join(OUT, '_squircle_preview.png'))
    print('Done.')


def preview_squircle(icon_path, preview_path):
    """Render the icon with an iOS squircle mask so you can eyeball clipping."""
    from PIL import ImageDraw
    icon = Image.open(icon_path).convert('RGBA')
    size = icon.size[0]
    # iOS squircle ≈ rounded rect with corner radius ~22% of side
    mask = Image.new('L', (size, size), 0)
    r = int(size * 0.225)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1),
                                           radius=r, fill=255)
    result = Image.new('RGBA', (size, size), (128, 128, 128, 255))
    result.paste(icon, (0, 0), mask)
    result.save(preview_path)


if __name__ == '__main__':
    main()
