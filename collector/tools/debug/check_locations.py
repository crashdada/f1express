locations = ["Australia", "China", "Japan", "Bahrain", "Saudi", "Miami", "Canada", "Austria", "Britain", "Belgium", "Hungary", "Netherlands", "Italy", "Azerbaijan", "Singapore", "USA", "Mexico", "Brazil", "Las Vegas", "Qatar", "Abu Dhabi"]

with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

found = []
for loc in locations:
    if loc in text:
        found.append(loc)

print("Locations found in flight data:", found)
print("Count:", len(found))
