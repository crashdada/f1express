with open('full_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('Australia')
if pos != -1:
    print("Found 'Australia' at pos:", pos)
    print("Context:", text[max(0, pos-200) : pos+1000])
else:
    print("'Australia' not found")
