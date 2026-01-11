def main():
    print("--- Thumbnail Generator ---")
    
    # 1. Ask user for the specific folder name to process
    # Default to 'images' if you just press Enter
    user_src = input("Enter source folder path (default: 'images'): ").strip()
    if not user_src:
        user_src = 'images'

    # 2. Ask where to save the thumbnails
    # Default to 'images/thumbs' if you just press Enter
    user_out = input("Enter output folder path (default: 'images/thumbs'): ").strip()
    if not user_out:
        user_out = 'images/thumbs'

    # 3. Ask for width preference
    user_width = input("Enter max width (default: 400): ").strip()
    if user_width and user_width.isdigit():
        max_width = int(user_width)
    else:
        max_width = 400

    # 4. Ask about WebP
    user_webp = input("Create WebP versions? (y/n, default: y): ").strip().lower()
    make_webp_flag = True if user_webp != 'n' else False

    # Setup paths
    src = os.path.abspath(user_src)
    out = os.path.abspath(user_out)

    if not os.path.exists(src):
        print(f"Error: The source folder '{src}' does not exist.")
        return

    print(f"\nProcessing images from: {src}")
    print(f"Saving thumbnails to:   {out}")
    print("-" * 30)

    # The original processing loop
    for root, dirs, files in os.walk(src):
        # Calculate where this subfolder should go in the output
        rel = os.path.relpath(root, src)
        dest_dir = os.path.join(out, rel)
        os.makedirs(dest_dir, exist_ok=True)
        
        for f in files:
            if f.lower().endswith(EXTS):
                src_path = os.path.join(root, f)
                dest_path = os.path.join(dest_dir, f)
                
                # Check if file already exists to avoid re-doing work (optional optimization)
                # if os.path.exists(dest_path): continue 

                make_thumbnail(src_path, dest_path, max_width, make_webp_flag)
                print(f'Processed: {f}')

    print("\nDone!")