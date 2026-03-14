import re

with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

matches = re.findall(r'"roundText":"Round (\d+)"', text)
print("Matches found:", matches)

# Try without quotes for the number just in case
matches2 = re.findall(r'"roundText":"Round (.*?)"', text)
print("Matches found (non-digit):", matches2)
