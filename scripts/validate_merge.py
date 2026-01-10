import json
import re
from pathlib import Path

main_path = Path(r"c:\Users\IDK\New folder\Cure's 2026 Inventoery Prospects\main_inventory_data.js")
copy_path = Path(r"c:\Users\IDK\New folder\AllScraper\inventory_data copy 2.js")


def extract_json_array(js_text):
    idx = js_text.find('const inventory')
    if idx == -1:
        idx = 0
    arr_start = js_text.find('[', idx)
    if arr_start == -1:
        raise ValueError('Could not find array start')
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
    return js_text[arr_start:arr_end+1]


def js_to_json_flex(js_array_text):
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
    try:
        return list(v)
    except Exception:
        return [str(v)]


def main():
    text_main = main_path.read_text(encoding='utf-8')
    text_copy = copy_path.read_text(encoding='utf-8')

    arr_main = extract_json_array(text_main)
    arr_copy = extract_json_array(text_copy)

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

    main_list = parse_js_array_objects(arr_main)
    copy_list = parse_js_array_objects(arr_copy)

    name_to_main = {normalize_name(it.get('name')): it for it in main_list}

    matches = 0
    diffs = []
    type_issues = []
    unmatched = []

    fields_of_interest = ['name','nickname','productStore','variation','basePrice','shipping','images','brief','description','dealTag']

    for c in copy_list:
        cname = normalize_name(c.get('name',''))
        m = name_to_main.get(cname)
        if m is None:
            unmatched.append(c.get('name'))
            continue
        matches += 1
        item_diffs = []
        for f in fields_of_interest:
            cv = c.get(f)
            mv = m.get(f)
            # normalize lists for comparison
            if f in ('images','brief'):
                cvn = ensure_list(cv)
                mvn = ensure_list(mv)
                if cvn != mvn:
                    item_diffs.append((f, mvn, cvn))
            else:
                if (mv or '') != (cv or ''):
                    item_diffs.append((f, mv, cv))
        if item_diffs:
            diffs.append((c.get('name'), item_diffs))

    # quick type checks across main_list
    for it in main_list:
        if 'brief' in it and not isinstance(it.get('brief'), list):
            type_issues.append((it.get('id'), it.get('name'), 'brief_not_list'))
        if 'images' in it and not isinstance(it.get('images'), list):
            type_issues.append((it.get('id'), it.get('name'), 'images_not_list'))

    print('Validation report:')
    print('  main items:', len(main_list))
    print('  copy items:', len(copy_list))
    print('  matches by name:', matches)
    print('  unmatched in main (names):', len(unmatched))
    if unmatched:
        for u in unmatched[:10]:
            print('   -', u)
    print('  items with diffs:', len(diffs))
    for name, item_diffs in diffs[:20]:
        print('\n--', name)
        for f, mv, cv in item_diffs:
            print(f'   * {f}: main={repr(mv)[:200]}  |  copy={repr(cv)[:200]}')

    print('\nType issues found in main:', len(type_issues))
    for t in type_issues[:20]:
        print('  -', t)


if __name__ == '__main__':
    main()
