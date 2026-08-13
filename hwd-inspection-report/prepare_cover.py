#!/usr/bin/env python3
"""
Build the flat black & white cover background (assets/cover_bg_flat.png).

The cover uses a single, pre-flattened grayscale image with the grey wash baked
in — NOT a CSS overlay. This is deliberate: a semi-transparent overlay layer can
be misrendered as a pink/magenta tint by some PDF viewers. Baking the tone into a
plain grayscale image (R == G == B, no transparency) guarantees it always shows
as grey.

Re-run this whenever you change assets/hero.png.

Usage:
    python prepare_cover.py [source.png]   (default: assets/hero.png)

Requires Pillow:  pip install Pillow
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

HERE = Path(__file__).parent
W, H = 794, 1123          # A4 portrait @ 96dpi
DARK = 34                 # grey the image is washed toward (0=black, 255=white)
ALPHA_TOP = 0.52          # wash strength at top of page
ALPHA_BOTTOM = 0.90       # wash strength at bottom (darker => white text stays legible)


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "assets" / "hero.png"
    im = Image.open(src).convert("RGB")

    # cover-crop to page size
    scale = max(W / im.width, H / im.height)
    im = im.resize((int(im.width * scale) + 1, int(im.height * scale) + 1))
    left = (im.width - W) // 2
    top = (im.height - H) // 2
    im = im.crop((left, top, left + W, top + H))

    # grayscale + gentle contrast, then a vertical grey wash baked in
    g = ImageOps.autocontrast(ImageOps.grayscale(im), cutoff=1)
    px = g.load()
    for y in range(H):
        a = ALPHA_TOP + (ALPHA_BOTTOM - ALPHA_TOP) * (y / (H - 1))
        for x in range(W):
            px[x, y] = int(px[x, y] * (1 - a) + DARK * a)

    out = Image.merge("RGB", (g, g, g))  # equal channels => cannot render pink
    dest = HERE / "assets" / "cover_bg_flat.png"
    out.save(dest)
    print(f"Wrote {dest} ({out.size[0]}x{out.size[1]})")


if __name__ == "__main__":
    main()
