with open('full_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

for race in ["Hungary", "Italy", "Zandvoort", "Silverstone"]:
    pos = text.find(race)
    print(f"{race}: {pos}")
    if pos != -1:
        print(f"Context for {race}: {text[pos-200 : pos+200]}")
