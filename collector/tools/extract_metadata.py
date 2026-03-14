import json

with open(r'c:\Users\jaymz\Desktop\oc\f1-website\public\data\schedule_2026.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

metadata = {}
for item in data:
    slug = item.get('slug')
    specs = item.get('circuitSpecs')
    if slug and specs:
        metadata[slug] = specs

with open('circuit_metadata.json', 'w', encoding='utf-8') as f:
    json.dump(metadata, f, ensure_ascii=False, indent=4)

print(f"Extracted metadata for {len(metadata)} circuits")
