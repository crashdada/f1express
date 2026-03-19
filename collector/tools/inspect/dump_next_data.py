import re
import json

def reconstruct_next_data(html):
    pattern = r'self\.__next_f\.push\(\[1,\"(.*?)\"\]\)'
    matches = re.findall(pattern, html)
    full_text = "".join(matches).replace('\\"', '"').replace('\\\\', '\\')
    return full_text

with open('f1_2026.html', 'r', encoding='utf-8') as f:
    html = f.read()

full_text = reconstruct_next_data(html)
with open('full_text_debug.txt', 'w', encoding='utf-8') as f:
    f.write(full_text)

print("Full text length:", len(full_text))
