import json
import re

with open('debug_next_data.txt', 'r', encoding='utf-8') as f:
    data = f.read()

matches = re.finditer(r'\"children\":\[', data)
idx = 0
for m in matches:
    start = m.end()
    count = 1
    pos = start
    while count > 0 and pos < len(data):
        if data[pos] == '[': count += 1
        elif data[pos] == ']': count -= 1
        pos += 1
    
    content = data[start-1:pos]
    if content.count('{') >= 24:
        with open(f'children_{idx}.json', 'w', encoding='utf-8') as f2:
            f2.write(content)
        print(f"Dumped children_{idx}.json with {content.count('{')} items")
        idx += 1
