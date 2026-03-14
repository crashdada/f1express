import requests
import re
import json

def reconstruct_next_data(html):
    pattern = r'self\.__next_f\.push\(\[1,\"(.*?)\"\]\)'
    matches = re.findall(pattern, html)
    full_text = "".join(matches).replace('\\"', '"').replace('\\\\', '\\')
    return full_text

url = "https://www.formula1.com/en/racing/2026/australia"
resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
full_text = reconstruct_next_data(resp.text)

# Search for sessions
# They are often in an array called "timetables"
import re
# Looking for [{"description":"Practice 1","startTime":"2026-03-06T01:30:00.000Z",...}]
# The key is "timetables"
start_tag = '"timetables":['
idx = full_text.find(start_tag)
if idx != -1:
    content = full_text[idx + len(start_tag) - 1:]
    brace_count, end_idx = 0, 0
    for i, char in enumerate(content):
        if char == '[': brace_count += 1
        elif char == ']': brace_count -= 1
        if brace_count == 0:
            end_idx = i + 1
            break
    sessions_data = json.loads(content[:end_idx])
    print(f"Found {len(sessions_data)} sessions")
    for s in sessions_data:
        print(f"  {s.get('description')}: {s.get('startTime')}")
else:
    print("Timetables not found in JSON, searching via broader regex")
    # Try broad regex for descriptions and startTimes
    found = re.findall(r'\"description\":\"(.*?)\".*?\"startTime\":\"(.*?)\"', full_text)
    for desc, start in found:
        print(f"  {desc}: {start}")
