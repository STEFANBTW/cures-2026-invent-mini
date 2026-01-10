"""
Generate thumbnails and WebP variants for the images/ folder.

Usage:
    python -m venv .venv
    .\.venv\Scripts\activate
    pip install pillow
    python scripts/generate_thumbnails.py --src images --out images/thumbs --max-width 400 --webp

This script will scan the source folder recursively for common image extensions,
create resized thumbnails that fit within the specified max width, and optionally
save WebP copies alongside the thumbnails.

Be careful: this script will NOT overwrite original files; it writes into the
`--out` directory and mirrors folder structure.
"""
import argparse
import os
from PIL import Image

EXTS = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.gif', '.webp')


def make_thumbnail(src_path, dest_path, max_width, make_webp=False, quality=85):
    try:
        with Image.open(src_path) as im:
            w, h = im.size
            if w <= max_width:
                # copy instead of resize
                im.save(dest_path)
            else:
                ratio = max_width / float(w)
                new_h = int(h * ratio)
                im = im.resize((max_width, new_h), Image.LANCZOS)
                im.save(dest_path, quality=quality)

            if make_webp:
                webp_dest = os.path.splitext(dest_path)[0] + '.webp'
                im.save(webp_dest, 'WEBP', quality=quality)
    except Exception as e:
        print(f"Failed to process {src_path}: {e}")


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--src', default='images', help='Source images folder')
    p.add_argument('--out', default='images/thumbs', help='Output folder for thumbnails')
    p.add_argument('--max-width', default=400, type=int)
    p.add_argument('--webp', action='store_true')
    args = p.parse_args()

    src = os.path.abspath(args.src)
    out = os.path.abspath(args.out)
    if not os.path.exists(src):
        print('Source folder does not exist:', src)
        return
    for root, dirs, files in os.walk(src):
        rel = os.path.relpath(root, src)
        dest_dir = os.path.join(out, rel)
        os.makedirs(dest_dir, exist_ok=True)
        for f in files:
            if f.lower().endswith(EXTS):
                src_path = os.path.join(root, f)
                dest_path = os.path.join(dest_dir, f)
                make_thumbnail(src_path, dest_path, args.max_width, args.webp)
                print('Wrote', dest_path)


if __name__ == '__main__':
    main()
