import json
import re
from pathlib import Path

# Paths (adjust if needed)
main_path = Path(r"c:\Users\IDK\New folder\Cure's 2026 Inventoery Prospects\main_inventory_data.js")
copy_path = Path(r"c:\Users\IDK\New folder\AllScraper\inventory_data copy 2.js")
out_path = main_path.with_name('main_inventory_data.updated.js')


def extract_json_array(js_text):
    # Find the first '[' after 'const inventory'
    idx = js_text.find('const inventory')
    if idx == -1:
        idx = 0
    arr_start = js_text.find('[', idx)
    if arr_start == -1:
        raise ValueError('Could not find array start')
    # Find matching closing bracket while ignoring brackets inside string literals
    in_string = False
    escape = False
    quote_char = ''
    depth = 0
    arr_end = None
    for i in range(arr_start, len(js_text)):
        ch = js_text[i]
        if in_string:
            if escape:
                escape = False
            elif ch == '\\':
                escape = True
            elif ch == quote_char:
                in_string = False
        else:
            if ch == '"' or ch == "'":
                in_string = True
                quote_char = ch
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
    # Remove JavaScript-style trailing commas before } or ]
    s = re.sub(r",\s*([}\]])", r"\1", js_array_text)
    return s


def normalize_name(n):
    return re.sub(r"\s+"," ", n or '').strip().lower()


def ensure_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        return [v]
    return list(v)


def merge_items(main_items, copy_items):
    name_to_main = {normalize_name(it.get('name')): it for it in main_items}
    max_id = max((it.get('id', 0) for it in main_items), default=0)
    added = 0

    for c in copy_items:
        cname = normalize_name(c.get('name', ''))
        if cname in name_to_main:
            m = name_to_main[cname]
            # Attributes to fully update
            for field in ['name','nickname','productStore','variation','basePrice']:
                if field in c:
                    m[field] = c[field]
            # Shipping handling
            if 'shipping' in c:
                ship = c['shipping']
                if isinstance(ship, str) and 'free shipping' in ship.lower():
                    m['shipping'] = ship
                else:
                    # Try extract number
                    if isinstance(ship, (int, float)):
                        m['shipping'] = ship
                    else:
                        nums = re.findall(r"[0-9,.]+", str(ship))
                        if nums:
                            num = nums[0].replace(',','')
                            try:
                                if '.' in num:
                                    m['shipping'] = float(num)
                                else:
                                    m['shipping'] = int(num)
                            except:
                                m['shipping'] = ship
                        else:
                            m['shipping'] = ship
            # Images: append (preserve existing)
            if 'images' in c:
                main_imgs = ensure_list(m.get('images'))
                copy_imgs = ensure_list(c.get('images'))
                for img in copy_imgs:
                    if img not in main_imgs:
                        main_imgs.append(img)
                m['images'] = main_imgs
            # brief: merge arrays, remove duplicates
            if 'brief' in c:
                main_brief = ensure_list(m.get('brief'))
                copy_brief = ensure_list(c.get('brief'))
                for b in copy_brief:
                    if b not in main_brief:
                        main_brief.append(b)
                m['brief'] = main_brief
            # description: merge text if new content not already present
            if 'description' in c:
                md = m.get('description','') or ''
                cd = c.get('description','') or ''
                if cd and cd.strip() not in md:
                    if md and not md.endswith('\n'):
                        md = md + '\n\n' + cd
                    else:
                        md = md + cd
                    m['description'] = md
            # Do NOT update dealTag
        else:
            # New item: add with next id
            max_id += 1
            new_item = dict(c)  # shallow copy
            # assign id
            new_item['id'] = max_id
            main_items.append(new_item)
            name_to_main[normalize_name(new_item.get('name'))] = new_item
            added += 1
    return main_items, added


def main():
    text_main = main_path.read_text(encoding='utf-8')
    text_copy = copy_path.read_text(encoding='utf-8')

    # find all const inventory occurrences and extract arrays
    starts = []
    idx = 0
    while True:
        idx = text_main.find('const inventory', idx)
        if idx == -1:
            break
        starts.append(idx)
        idx += len('const inventory')

    arrays = []
    for idx in starts:
        arr_start = text_main.find('[', idx)
        if arr_start == -1:
            continue
        in_string = False
        escape = False
        quote = ''
        depth = 0
        arr_end = None
        for i in range(arr_start, len(text_main)):
            ch = text_main[i]
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
            continue
        arr_text = text_main[arr_start:arr_end+1]
        arrays.append((idx, arr_start, arr_end, arr_text))

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

    # pick the largest inventory array (most objects) as the main source
    best = None
    best_count = -1
    for entry in arrays:
        arr_text = entry[3]
        try:
            objs = parse_js_array_objects(arr_text)
            if len(objs) > best_count:
                best_count = len(objs)
                best = objs
        except Exception:
            continue

    if best is None:
        raise ValueError('No inventory array found in main file')

    main_list = best

    # parse copy file (single array expected)
    arr_text_copy, pre_copy, post_copy = extract_json_array(text_copy)
    copy_list = parse_js_array_objects(arr_text_copy)

    merged, added = merge_items(main_list, copy_list)

    # Write a clean single-array JS file (overwrite both main and updated)
    new_array_text = json.dumps(merged, indent=4, ensure_ascii=False)
    new_js = 'const inventory = ' + new_array_text + ';\n\nmodule.exports = { inventory };\n'

    out_path.write_text(new_js, encoding='utf-8')
    main_path.write_text(new_js, encoding='utf-8')
    print(f"Wrote {out_path} and overwritten {main_path} with {len(merged)} items ({added} added).")

if __name__ == '__main__':
    main()
