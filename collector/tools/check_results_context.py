with open('results_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

pos = text.find('Abu Dhabi')
print("Context for Abu Dhabi in Results:", text[pos-200 : pos+200])
