with open('full_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

start_tag = '"secondaryNavigationSchedule":['
start_idx = text.find(start_tag)
if start_idx != -1:
    print("Found tag at:", start_idx)
    # Extract around 4000 chars to see multiple items
    print(text[start_idx : start_idx + 4000])
else:
    print("Tag not found")
