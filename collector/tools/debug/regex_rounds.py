import re
import json

with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Search for patterns like {"roundNumber":"1",...}
# We'll look for blocks of JSON that contain roundNumber and meetingName
# They are likely inside a large string or array
matches = re.finditer(r'\{"roundNumber":"(\d+)".*?"meetingName":"(.*?)"(.*?)\}', text)
rounds = {}
for m in matches:
    num = int(m.group(1))
    name = m.group(2)
    extra = m.group(3)
    if num not in rounds:
        rounds[num] = {"name": name, "extra": extra}

print(f"Found {len(rounds)} unique rounds via regex search:")
for n in sorted(rounds.keys()):
    print(f"Round {n}: {rounds[n]['name']}")
