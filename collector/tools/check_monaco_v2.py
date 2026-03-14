with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('Monaco')
print(text[pos-100 : pos+200])
