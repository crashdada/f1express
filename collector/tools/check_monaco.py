with open('full_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('Monaco')
if pos != -1:
    print("Found 'Monaco' at:", pos)
    print("Context:", text[pos-500 : pos+1000])
else:
    print("'Monaco' not found")
