import re
import json

def reconstruct_next_data(html):
    pattern = r'self\.__next_f\.push\(\[1,\"(.*?)\"\]\)'
    matches = re.findall(pattern, html)
    full_text = "".join(matches).replace('\\"', '"').replace('\\\\', '\\')
    return full_text

with open('f1_2026_results.html', 'r', encoding='utf-8') as f:
    text = reconstruct_next_data(f.read())

# Look for the racing results table data
# In 2024 it was in "rows"
# Let's search for "Melbourne" or "Australia" in the results text
pos = text.find('Australia')
print("Australia pos in results text:", pos)
if pos != -1:
    print(text[pos-200 : pos+1000])
