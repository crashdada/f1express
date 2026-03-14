import re

with open('full_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Find all occurrences of "round":X or "round":"X"
matches = re.finditer(r'"round":', text)
for i, match in enumerate(matches):
    start = match.start()
    print(f"Match {i} at {start}: {text[start:start+100]}")
    if i > 50: break
