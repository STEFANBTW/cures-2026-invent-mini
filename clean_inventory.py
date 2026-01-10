import json
import os
import shutil

# Configuration
FILE_PATH = 'main_inventory_data.js'

def filter_inventory():
    # 1. Check if file exists
    if not os.path.exists(FILE_PATH):
        print(f"Error: The file '{FILE_PATH}' was not found.")
        return

    # 2. Create a backup just in case
    shutil.copy(FILE_PATH, f"{FILE_PATH}.bak")
    print(f"Backup created: {FILE_PATH}.bak")

    # 3. Read the file content
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()

    # 4. Extract the JSON array part
    # We look for the first opening bracket '[' and the last closing bracket ']'
    start_index = content.find('[')
    end_index = content.rfind(']') + 1

    if start_index == -1 or end_index == 0:
        print("Error: Could not find a data array [...] in the file.")
        return

    # Save the JS prefix (e.g., 'const inventory = ') and suffix (e.g., ';')
    js_prefix = content[:start_index]
    js_suffix = content[end_index:]
    
    raw_json_string = content[start_index:end_index]

    # 5. Parse and Filter
    try:
        inventory_list = json.loads(raw_json_string)
        
        # Calculate stats for reporting
        initial_count = len(inventory_list)
        
        # FILTER: Keep only items where essentialRank is 1
        # We use .get() to handle cases where the key might be missing safely
        filtered_list = [
            item for item in inventory_list 
            if item.get('essentialRank') == 1
        ]
        
        removed_count = initial_count - len(filtered_list)

    except json.JSONDecodeError as e:
        print(f"Error parsing the data: {e}")
        print("Note: Ensure the data inside the brackets is valid JSON (quoted keys, no trailing commas).")
        return

    # 6. Reconstruct the file content
    # indent=4 makes it readable, ensure_ascii=False preserves special characters
    new_json_string = json.dumps(filtered_list, indent=4, ensure_ascii=False)
    
    final_content = js_prefix + new_json_string + js_suffix

    # 7. Write back to file
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        f.write(final_content)

    print("-" * 30)
    print("Process Complete!")
    print(f"Original items: {initial_count}")
    print(f"Items removed:  {removed_count}")
    print(f"Items remaining: {len(filtered_list)}")
    print("-" * 30)

if __name__ == "__main__":
    filter_inventory()