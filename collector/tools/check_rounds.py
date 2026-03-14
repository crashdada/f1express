with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

for i in range(1, 25):
    s = f"ROUND {i}"
    pos = text.find(s)
    print(f"'{s}': {pos}")
