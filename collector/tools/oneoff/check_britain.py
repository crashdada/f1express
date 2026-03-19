with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('great-britain')
print("Context for great-britain:", text[pos-200 : pos+200])
