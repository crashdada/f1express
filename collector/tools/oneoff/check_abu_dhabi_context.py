with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('Abu Dhabi')
if pos != -1:
    print(f"Abu Dhabi found at {pos}")
    print(text[pos-500 : pos+1000])
