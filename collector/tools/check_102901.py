with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

print(text[102901-200 : 102901+1000])
