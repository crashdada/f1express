import re

with open('f1_2026.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find the first 10 push calls and print their starting 100 chars
matches = re.finditer(r'self\.__next_f\.push\(\[(.*?)\]\)', html)
for i, m in enumerate(matches):
    print(f"Push {i}: {m.group(1)[:200]}")
    if i > 20: break
