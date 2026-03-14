import re

with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.finditer(r'"meetingKey":', text)
for i, m in enumerate(matches):
    start = m.start()
    print(f"Match {i} at {start}: {text[start : start+500]}")
