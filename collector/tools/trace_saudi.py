with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('STC SAUDI ARABIAN GRAND PRIX 2026')
if pos != -1:
    print(f"Found GP name at {pos}")
    print(text[pos-500 : pos+1000])
else:
    print("Not found")
