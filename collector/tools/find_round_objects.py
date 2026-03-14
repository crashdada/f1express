import re
import json

with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Look for patterns that look like objects with "slug" or "gpName"
# We want to find where the 24 races are defined.
# Let's try to find "round": in a larger context
matches = re.finditer(r'\{"round":"ROUND \d+"', text)
for i, m in enumerate(matches):
    start = m.start()
    # Try to extract the whole object
    brace_count = 0
    end_idx = -1
    for j in range(start, len(text)):
        if text[j] == '{': brace_count += 1
        elif text[j] == '}': brace_count -= 1
        if brace_count == 0:
            end_idx = j + 1
            break
    
    if end_idx != -1:
        obj_text = text[start:end_idx]
        print(f"Match {i} at {start} (Length {len(obj_text)}):")
        print(obj_text[:300])
    if i > 50: break
