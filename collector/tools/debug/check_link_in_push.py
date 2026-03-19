with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('href="/en/racing/2026/monaco"')
if pos != -1:
    print("Found link at:", pos)
    print(text[pos-200 : pos+1000])
else:
    print("Link not found")
