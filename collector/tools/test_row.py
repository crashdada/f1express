import requests
from scraper import F1DataCollector
import json

collector = F1DataCollector()
url = "https://www.formula1.com/en/results/2026/races/1279/australia/race-result"
html = collector.fetch_page(url)

full_text = collector._reconstruct_next_data(html)
start_tag = '"rows":['
start_idx = full_text.find(start_tag)
content = full_text[start_idx + len(start_tag) - 1:]
brace_count, end_idx = 0, 0
for i, char in enumerate(content):
    if char == '[': brace_count += 1
    elif char == ']': brace_count -= 1
    if brace_count == 0:
        end_idx = i + 1
        break

rows = json.loads(content[:end_idx])
if rows:
    with open("test_row.json", "w", encoding="utf-8") as f:
        json.dump(rows[0], f, indent=2)
