with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

for race in ["Saudi", "Miami", "Canada", "Austria", "Britain", "Belgium", "Budapest", "Zandvoort", "Monza", "Baku", "Singapore", "Austin", "Mexico", "Sao Paulo", "Las Vegas", "Qatar", "Abu Dhabi"]:
    print(f"{race}: {text.find(race)}")
