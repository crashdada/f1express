from bs4 import BeautifulSoup

with open('f1_2026.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

link = soup.find('a', href='/en/racing/2026/monaco')
if link:
    # Print the parent and siblings to see the structure
    parent = link.parent
    print("--- Parent ---")
    print(parent.prettify()[:2000])
    
    # Try to find a common container for all races
    # Usually it's a div with a specific class
else:
    print("Link not found")
