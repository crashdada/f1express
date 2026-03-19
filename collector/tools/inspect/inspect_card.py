from bs4 import BeautifulSoup

with open('f1_2026.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

link = soup.find('a', href='/en/racing/2026/australia')
if link:
    print("Attributes:", link.attrs)
    # Print the full HTML of the card
    print(link.prettify()[:1000])
else:
    print("Link not found")
