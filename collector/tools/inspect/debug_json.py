with open('full_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

start_tag = '"secondaryNavigationSchedule":['
start_idx = text.find(start_tag)
if start_idx != -1:
    # Find the end of the array
    brace_count = 0
    content = text[start_idx + len(start_tag) - 1:]
    for i, char in enumerate(content):
        if char == '[': brace_count += 1
        elif char == ']': brace_count -= 1
        if brace_count == 0:
            end_idx = i + 1
            break
    
    json_data = content[:end_idx]
    print("Found JSON block of length:", len(json_data))
    
    import json
    try:
        data = json.loads(json_data)
        print("Number of items in secondaryNavigationSchedule:", len(data))
        for i, item in enumerate(data):
            print(f"Item {i}: {item.get('meetingName') or item.get('gpName')}")
    except Exception as e:
        print("JSON parse failed:", e)
        print("Start of failing block:", json_data[:200])
else:
    print("Tag not found")
