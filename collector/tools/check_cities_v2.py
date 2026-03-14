import re

with open('full_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

for search_term in ["Australia", "China", "Japan", "Suzuka", "Bahrain", "Saudi", "Miami", "Canada"]:
    pos = text.find(search_term)
    print(f"{search_term}: {pos}")

matches = re.findall(r'"roundText":"Round (\d+)"', text)
print("Round numbers found:", sorted(list(set(matches))))
