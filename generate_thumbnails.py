"""
Thumbnail Generator Script
Generates thumbnail versions of all images in the product and images folders.
Thumbnails are saved alongside original images with '_thumb' suffix.
"""

import os
from pathlib import Path
from PIL import Image
import sys

# Configuration
THUMBNAIL_SIZE = (300, 300)  # Thumbnail dimensions
THUMBNAIL_QUALITY = 85  # JPEG quality (1-95)
SOURCE_DIRS = [
    'hostairtel'
]

SUPPORTED_FORMATS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}


def generate_thumbnails(root_dir='.'):
    """
    Recursively find all images and generate thumbnails.
    Thumbnails are saved with '_thumb' suffix before the file extension.
    """
    total_processed = 0
    total_skipped = 0
    errors = []

    for source_dir in SOURCE_DIRS:
        dir_path = Path(root_dir) / source_dir
        
        if not dir_path.exists():
            print(f"⚠️  Directory not found: {dir_path}")
            continue
        
        print(f"\n📁 Processing: {source_dir}")
        
        # Walk through all subdirectories
        for root, dirs, files in os.walk(dir_path):
            for filename in files:
                file_path = Path(root) / filename
                file_ext = file_path.suffix.lower()
                
                # Check if file is an image and not already a thumbnail
                if file_ext not in SUPPORTED_FORMATS or '_thumb' in filename:
                    continue
                
                try:
                    # Open image
                    with Image.open(file_path) as img:
                        # Convert RGBA to RGB if necessary (for JPEG compatibility)
                        if img.mode in ('RGBA', 'LA', 'P'):
                            rgb_img = Image.new('RGB', img.size, (255, 255, 255))
                            rgb_img.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                            img = rgb_img
                        
                        # Create thumbnail
                        img.thumbnail(THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
                        
                        # Generate thumbnail filename
                        stem = file_path.stem
                        new_filename = f"{stem}_thumb{file_ext}"
                        thumb_path = file_path.parent / new_filename
                        
                        # Save thumbnail
                        if file_ext in {'.jpg', '.jpeg'}:
                            img.save(thumb_path, 'JPEG', quality=THUMBNAIL_QUALITY, optimize=True)
                        else:
                            img.save(thumb_path, optimize=True)
                        
                        total_processed += 1
                        rel_path = thumb_path.relative_to(root_dir)
                        print(f"  ✓ {rel_path.as_posix()}")
                
                except Exception as e:
                    total_skipped += 1
                    error_msg = f"  ✗ Error processing {file_path.name}: {str(e)}"
                    print(error_msg)
                    errors.append(error_msg)
    
    # Summary
    print(f"\n{'='*60}")
    print(f"✅ Thumbnail Generation Complete!")
    print(f"   Processed: {total_processed} images")
    print(f"   Skipped/Errors: {total_skipped}")
    if errors:
        print(f"\n⚠️  Error Details:")
        for error in errors[:5]:  # Show first 5 errors
            print(error)
        if len(errors) > 5:
            print(f"   ... and {len(errors) - 5} more errors")
    print(f"{'='*60}")


if __name__ == '__main__':
    try:
        # Change to script directory
        script_dir = Path(__file__).parent
        os.chdir(script_dir)
        
        print("🚀 Starting Thumbnail Generation...")
        print(f"📍 Working directory: {os.getcwd()}")
        
        generate_thumbnails()
        
        print("\n💡 Next steps:")
        print("   1. Update script16.min.js tool cards to use thumbnails")
        print("   2. Update summary.js summary cards to use thumbnails")
        print("   3. Keep full images for panel descriptions (already done)")
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        sys.exit(1)
