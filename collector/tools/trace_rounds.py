import re

with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

matches = list(re.finditer(r'"roundNumber":"(\d+)"', text))
print("Found", len(matches), "roundNumber occurrences")
for m in matches:
    print(f"Pos {m.start()}: {text[m.start() : m.start()+200]}")
