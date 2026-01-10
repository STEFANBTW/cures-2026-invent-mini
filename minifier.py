import os
import sys
import re # We will use this for HTML minification instead of htmlmin

# Import the external minifiers for CSS and JS
try:
    from csscompressor import compress as compress_css
    from jsmin import jsmin
except ImportError:
    print("Missing libraries! Please run: pip install csscompressor jsmin")
    sys.exit(1)

def simple_html_minify(html_content):
    """
    A simple, built-in HTML minifier to avoid installing broken libraries.
    1. Removes comments.
    2. Removes whitespace between tags.
    3. Collapses multiple spaces into one.
    """
    # Remove HTML comments
    html_content = re.sub(r'', '', html_content, flags=re.DOTALL)
    # Remove whitespace between tags (e.g. >   < becomes ><)
    html_content = re.sub(r'>\s+<', '><', html_content)
    # Collapse multiple spaces into one (be careful with pre tags, but fine for basic sites)
    html_content = re.sub(r'\s{2,}', ' ', html_content)
    return html_content.strip()

def minify_file(filename):
    if not os.path.exists(filename):
        print(f"❌ Error: '{filename}' not found.")
        return

    base_name, ext = os.path.splitext(filename)
    ext = ext.lower()
    
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"❌ Error reading '{filename}': {e}")
        return

    output_content = ""
    file_type = ""

    # Determine file type
    if ext == '.css':
        file_type = "CSS"
        output_content = compress_css(content)
    elif ext == '.js':
        file_type = "JavaScript"
        output_content = jsmin(content)
    elif ext in ['.html', '.htm']:
        file_type = "HTML"
        # Use our custom function above
        output_content = simple_html_minify(content)
    else:
        print(f"⚠️  Skipping '{filename}': Unsupported file extension.")
        return

    # Generate new filename
    output_filename = f"{base_name}.min{ext}"

    # Write the minified file
    try:
        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write(output_content)
        
        # Calculate stats
        original_size = len(content.encode('utf-8'))
        new_size = len(output_content.encode('utf-8'))
        savings = 100 - (new_size / original_size * 100) if original_size > 0 else 0

        print(f"✅ Minified {file_type}: {filename} -> {output_filename}")
        print(f"   Saved {savings:.1f}% ({original_size}b -> {new_size}b)")

    except Exception as e:
        print(f"❌ Error writing '{output_filename}': {e}")

def main():
    print("--- 🔨 Python File Minifier (Fixed for Python 3.13+) ---")
    print("Enter the filenames you want to minify (separated by spaces).")
    print("Example: style16.css script.js index.html")
    
    user_input = input("\n> ").strip()
    
    if not user_input:
        print("No files entered.")
        return

    files = user_input.split()
    print("-" * 30)
    
    for file in files:
        minify_file(file)
    
    print("-" * 30)
    print("Done!")

if __name__ == "__main__":
    main()