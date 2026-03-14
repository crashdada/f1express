with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

for slug in ["australia", "china", "japan", "bahrain", "saudi-arabia", "miami", "emilia-romagna", "monaco", "canada", "austria", "great-britain", "hungary", "belgium", "netherlands", "italy", "azerbaijan", "singapore", "united-states", "mexico", "brazil", "las-vegas", "qatar", "abu-dhabi"]:
    print(f"{slug}: {text.find(slug)}")
