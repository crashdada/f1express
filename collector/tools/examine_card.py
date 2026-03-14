from bs4 import BeautifulSoup
import re

with open('f1_2026.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

card = soup.find('a', href='/en/racing/2026/australia')
if card:
    # Use a more detailed text extraction
    for i, tag in enumerate(card.find_all(True)):
        if tag.string:
            print(f"[{i}] {tag.name}: {tag.string.strip()}")
else:
    print("Not found")
