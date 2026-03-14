from bs4 import BeautifulSoup

with open('f1_2026.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

link = soup.find('a', href='/en/racing/2026/australia')
if link:
    curr = link
    for i in range(10):
        print(f"[{i}] Tag: {curr.name}, Classes: {curr.get('class')}")
        # Print a bit of text from here
        print(f"    Text: {curr.get_text()[:50]}")
        curr = curr.parent
else:
    print("Link not found")
