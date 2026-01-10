import json
import re
from pathlib import Path

main_path = Path(r"c:\Users\IDK\New folder\Cure's 2026 Inventoery Prospects\main_inventory_data.js")

def extract_json_array(js_text):
    idx = js_text.find('const inventory')
    if idx == -1:
        idx = 0
    arr_start = js_text.find('[', idx)
    if arr_start == -1:
        raise ValueError('Could not find array start')
    in_string = False
    escape = False
    quote = ''
    depth = 0
    arr_end = None
    for i in range(arr_start, len(js_text)):
        ch = js_text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == quote:
                in_string = False
        else:
            if ch == '"' or ch == "'":
                in_string = True
                quote = ch
            elif ch == '[':
                depth += 1
            elif ch == ']':
                depth -= 1
                if depth == 0:
                    arr_end = i
                    break
    if arr_end is None:
        raise ValueError('Could not find array end')
    return js_text[arr_start:arr_end+1], js_text[:arr_start], js_text[arr_end+1:]


def js_to_json_flex(js_array_text):
    s = re.sub(r",\s*([}\]])", r"\1", js_array_text)
    return s


def parse_js_array_objects(js_array_text):
    objects = []
    i = 0
    n = len(js_array_text)
    while i < n:
        ch = js_array_text[i]
        if ch == '{':
            in_string = False
            escape = False
            quote = ''
            depth = 0
            start = i
            end = None
            for j in range(i, n):
                c = js_array_text[j]
                if in_string:
                    if escape:
                        escape = False
                    elif c == '\\':
                        escape = True
                    elif c == quote:
                        in_string = False
                else:
                    if c == '"' or c == "'":
                        in_string = True
                        quote = c
                    elif c == '{':
                        depth += 1
                    elif c == '}':
                        depth -= 1
                        if depth == 0:
                            end = j
                            break
            if end is None:
                raise ValueError('Unterminated object')
            obj_text = js_array_text[start:end+1]
            obj_text = js_to_json_flex(obj_text)
            obj = json.loads(obj_text)
            objects.append(obj)
            i = end + 1
        else:
            i += 1
    return objects


def main():
    text = main_path.read_text(encoding='utf-8')
    arr_text, pre, post = extract_json_array(text)
    
    items = parse_js_array_objects(arr_text)
    
    removed_count = 0
    for item in items:
        if 'images' in item and isinstance(item['images'], list):
            filtered = []
            for img in item['images']:
                if isinstance(img, str) and img.startswith('https://'):
                    removed_count += 1
                else:
                    filtered.append(img)
            item['images'] = filtered
    
    new_array_text = json.dumps(items, indent=4, ensure_ascii=False)
    new_js = 'const inventory = ' + new_array_text + ';\n\nmodule.exports = { inventory };\n'
    
    main_path.write_text(new_js, encoding='utf-8')
    print(f"Removed {removed_count} https:// image links from {main_path}")

if __name__ == '__main__':
    main()
