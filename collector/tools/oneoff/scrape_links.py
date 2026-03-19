from bs4 import BeautifulSoup

with open('f1_2026.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

links = soup.find_all('a', href=True)
racing_links = []
for l in links:
    href = l['href']
    if '/en/racing/2026/' in href and not href.endswith('/2026/'):
        racing_links.append(href)

racing_links = sorted(list(set(racing_links)))
print(f"Found {len(racing_links)} unique racing links:")
for l in racing_links:
    print(l)
