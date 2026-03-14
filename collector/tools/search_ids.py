with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

for i in range(1279, 1310):
    s = f'"{i}"'
    if s in text:
        print(f"Found {s} at {text.find(s)}")
