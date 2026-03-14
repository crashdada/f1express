with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

import re
matches = [m.start() for m in re.finditer('Australia', text)]
print("All Australia positions:", matches)

for m in matches:
    print(f"--- Context at {m} ---")
    print(text[max(0, m-100) : m+300])
