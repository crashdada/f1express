import json
import re

with open('debug_next_data.txt', 'r', encoding='utf-8') as f:
    data = f.read()

# Find all occurrences of "key":[
matches = re.finditer(r'\"(\w+)\":\[', data)
for m in matches:
    key = m.group(1)
    # Find end of array
    start = m.end()
    count = 1
    pos = start
    while count > 0 and pos < len(data):
        if data[pos] == '[': count += 1
        elif data[pos] == ']': count -= 1
        pos += 1
    
    array_content = data[start-1:pos]
    try:
        # Check if it looks like an array of many items
        if array_content.count(',') > 10:
            print(f"Key: {key}, Length approx: {len(array_content)}, Items approx: {array_content.count('{')}")
            if 'meetingKey' in array_content:
                print(f"  --> Contains meetingKey!")
    except:
        pass
