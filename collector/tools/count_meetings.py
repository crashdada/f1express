with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = list(re.finditer(r'"meetingName":"(.*?)"', text))
print("Matches for 'meetingName':", len(matches))
for m in matches:
    print(m.group(1))
