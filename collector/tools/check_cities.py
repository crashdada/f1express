with open('full_text_debug.txt', 'r', encoding='utf-8') as f:
    text = f.read()

for city in ["Australia", "China", "Suzuka", "Bahrain", "Saudi", "Miami", "Imola", "Monaco"]:
    pos = text.find(city)
    print(f"{city}: {pos}")

# Count rounds
matches = re.findall(r'"roundText":"Round \d+"', text)
print("Round matches count:", len(matches))
print("Unique Round matches:", set(matches))
