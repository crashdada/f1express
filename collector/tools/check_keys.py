import json

with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

start_tag = '"secondaryNavigationSchedule":['
start_idx = text.find(start_tag)
if start_idx != -1:
    brace_count = 0
    content = text[start_idx + len(start_tag) - 1:]
    for i, char in enumerate(content):
        if char == '[': brace_count += 1
        elif char == ']': brace_count -= 1
        if brace_count == 0:
            end_idx = i + 1
            break
    
    data = json.loads(content[:end_idx])
    print("Keys of first item:", data[0].keys())
    print("First item:", data[0])
else:
    print("Tag not found")
