with open('full_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = re.finditer(r'"meetingKey":"(.*?)"', text)
keys = []
for m in matches:
    keys.append(m.group(1))

print("Total meetingKeys found:", len(keys))
print("MeetingKeys:", keys)

# Let's search for the actual schedule data structure
# It might be in a block called "raceList" or "eventList" or "schedule"
for pattern in ['"raceList":[', '"eventList":[', '"schedule":[']:
    pos = text.find(pattern)
    print(f"Pattern {pattern}: {pos}")
