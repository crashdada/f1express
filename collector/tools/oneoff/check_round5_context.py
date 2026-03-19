with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('ROUND 5')
print(text[pos-200 : pos+1000])
