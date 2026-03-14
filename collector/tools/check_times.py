import re
with open('australia_next.txt', 'r', encoding='utf-8') as f:
    txt = f.read()

res = re.findall(r'\"startTime\":\"(2026-.*?)\"', txt)
for r in res[:20]:
    print(r)

offset = re.findall(r'\"gmtOffset\":\"(.*?)\"', txt)
print(f"GMT Offsets: {set(offset)}")
