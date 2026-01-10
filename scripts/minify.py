#!/usr/bin/env python3
"""
Minification script for Cure's Inventory Prospects
Minifies script16.js and style16.css to reduce file sizes
Usage: python scripts/minify.py
"""

import os
import re
import sys

def minify_js(js_content):
    """Safe JavaScript minification"""
    # Remove single-line comments
    js_content = re.sub(r'//[^\n]*$', '', js_content, flags=re.MULTILINE)
    
    # Remove multi-line comments
    js_content = re.sub(r'/\*[\s\S]*?\*/', '', js_content)
    
    # Collapse whitespace
    js_content = re.sub(r'\s+', ' ', js_content)
    
    # Remove spaces around these characters (carefully, avoid colons in URLs)
    js_content = re.sub(r'\s*{\s*', '{', js_content)
    js_content = re.sub(r'\s*}\s*', '}', js_content)
    js_content = re.sub(r'\s*\[\s*', '[', js_content)
    js_content = re.sub(r'\s*\]\s*', ']', js_content)
    js_content = re.sub(r'\s*\(\s*', '(', js_content)
    js_content = re.sub(r'\s*\)\s*', ')', js_content)
    js_content = re.sub(r'\s*;\s*', ';', js_content)
    # NOTE: Skip removing spaces around colons - they appear in URLs!
    js_content = re.sub(r'\s*,\s*', ',', js_content)
    js_content = re.sub(r'\s*=\s*', '=', js_content)
    
    # Fix broken patterns
    js_content = js_content.replace('}else', '} else')
    js_content = js_content.replace('}catch', '} catch')
    js_content = js_content.replace('}finally', '} finally')
    js_content = js_content.replace(')=>', ') =>')
    
    return js_content.strip()

def minify_css(css_content):
    """Basic CSS minification"""
    # Remove comments
    css_content = re.sub(r'/\*.*?\*/', '', css_content, flags=re.DOTALL)
    
    # Remove unnecessary whitespace
    css_content = re.sub(r'\s+', ' ', css_content)
    css_content = re.sub(r'\s*([{}:;,])\s*', r'\1', css_content)
    
    return css_content.strip()

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    files = [
        ('script16.js', 'script16.min.js', minify_js),
        ('summary.js', 'summary.min.js', minify_js),
        ('style16.css', 'style16.min.css', minify_css),
    ]
    
    for source_name, dest_name, minify_func in files:
        source_path = os.path.join(base_dir, source_name)
        dest_path = os.path.join(base_dir, dest_name)
        
        if not os.path.exists(source_path):
            print(f"❌ {source_name} not found!")
            continue
        
        try:
            with open(source_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            minified = minify_func(content)
            
            with open(dest_path, 'w', encoding='utf-8') as f:
                f.write(minified)
            
            original_size = len(content)
            minified_size = len(minified)
            reduction = ((original_size - minified_size) / original_size) * 100
            
            print(f"✅ {source_name}")
            print(f"   Original: {original_size:,} bytes")
            print(f"   Minified: {minified_size:,} bytes")
            print(f"   Reduction: {reduction:.1f}%\n")
        
        except Exception as e:
            print(f"❌ Error minifying {source_name}: {e}")
            return 1
    
    print("✅ Minification complete!")
    print("\n📝 Next steps:")
    print("   1. Update index.html to load script16.min.js and style16.min.css")
    print("   2. Test in browser")
    return 0

if __name__ == '__main__':
    sys.exit(main())
