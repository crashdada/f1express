from bs4 import BeautifulSoup

with open('f1_2026.html', 'r', encoding='utf-8') as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

melbourne = soup.find(string=lambda t: 'Melbourne' in str(t))
if melbourne:
    # Print the parent tags
    curr = melbourne.parent
    for _ in range(5):
        print(f"Tag: {curr.name}, Classes: {curr.get('class')}")
        curr = curr.parent
else:
    print("Melbourne not found")
