import re

with open('f1_2026.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find all self.__next_f.push calls
matches = re.findall(r'self\.__next_f\.push\(\[(.*?)\]\)', html)
print(f"Found {len(matches)} push calls")

full_content = ""
for m in matches:
    # m is like '1,"..." '
    parts = m.split(',', 1)
    if len(parts) > 1:
        content = parts[1].strip()
        if content.startswith('"') and content.endswith('"'):
            content = content[1:-1]
            content = content.replace('\\"', '"').replace('\\\\', '\\')
            full_content += content

with open('full_raw_next.txt', 'w', encoding='utf-8') as f:
    f.write(full_content)

print("Full raw content length:", len(full_content))
for race in ["Hungary", "Italy", "Zandvoort", "Silverstone", "Monaco", "Spa", "Monza"]:
    print(f"{race}: {full_content.find(race)}")
