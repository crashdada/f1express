import re
import json

def reconstruct_next_data(html):
    pattern = r'self\.__next_f\.push\(\[1,\"(.*?)\"\]\)'
    matches = re.findall(pattern, html)
    full_text = "".join(matches).replace('\\"', '"').replace('\\\\', '\\')
    return full_text

with open('f1_2026_results.html', 'r', encoding='utf-8') as f:
    html = f.read()

text = reconstruct_next_data(html)
with open('results_text_debug.txt', 'w', encoding='utf-8') as f:
    f.write(text)

# Search for "rows":[{...}] or similar
start_tag = '"rows":['
start_idx = text.find(start_tag)
if start_idx != -1:
    print("Found rows at:", start_idx)
    # Count how many items in rows
    matches = re.findall(r'\{"content":', text[start_idx:])
    print("Potential row content matches:", len(matches))
else:
    print("Rows not found")

for race in ["Australia", "China", "Japan", "Bahrain", "Saudi", "Miami", "Canada", "Abu Dhabi"]:
    print(f"{race}: {text.find(race)}")
