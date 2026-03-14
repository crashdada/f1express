import json
import re

with open('debug_next_data.txt', 'r', encoding='utf-8') as f:
    data = f.read()

# Try to find "meetings":[
match = re.search(r'\"meetings\":\[(.*?)\]', data)
if match:
    # Need to find the balancing bracket
    start_pos = match.start() + 11
    count = 1
    end_pos = start_pos
    while count > 0 and end_pos < len(data):
        if data[end_pos] == '[':
            count += 1
        elif data[end_pos] == ']':
            count -= 1
        end_pos += 1
    
    meetings_str = data[start_pos-1:end_pos]
    try:
        # Pre-process common escape issues in this specific dump
        # The dump from the subagent might have \", replace with "
        clean_str = meetings_str.replace('\\"', '"').replace('\\\\', '\\')
        # Simple check for JSON
        # print("Meetings string (first 100):", clean_str[:100])
        # Try to parse it
        # Actually just print it and I'll see
        with open('meetings_found.json', 'w', encoding='utf-8') as f2:
            f2.write(clean_str)
        print("Wrote meetings to meetings_found.json")
    except Exception as e:
        print("Error processing meetings:", e)
else:
    print("No 'meetings':[] found")
