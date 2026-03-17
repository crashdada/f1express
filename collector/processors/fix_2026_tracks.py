import json
import os
import requests

def patch_2026_schedule():
    path = 'data/schedule_2026.json'
    if not os.path.exists(path):
        print("Schedule file not found.")
        return

    with open(path, 'r', encoding='utf-8') as f:
        schedule = json.load(f)

    # 2026 Official Slugs from F1 CDN
    SLUG_MAP = {
        "australia": "melbourne",
        "china": "shanghai",
        "japan": "suzuka",
        "bahrain": "sakhir",
        "saudi-arabia": "jeddah",
        "miami": "miami",
        "canada": "montreal",
        "monaco": "montecarlo",
        "barcelona-catalunya": "catalunya",
        "austria": "spielberg",
        "great-britain": "silverstone",
        "belgium": "spafrancorchamps",
        "hungary": "hungaroring",
        "netherlands": "zandvoort",
        "italy": "monza",
        "spain": "madring",
        "azerbaijan": "baku",
        "singapore": "singapore",
        "united-states": "austin",
        "mexico": "mexicocity",
        "brazil": "interlagos",
        "las-vegas": "lasvegas",
        "qatar": "lusail",
        "abu-dhabi": "yasmarinacircuit"
    }

    v = "v1740000000" # Latest 2026 version
    
    # URL Patterns
    outline_url = f"https://media.formula1.com/image/upload/c_lfill,w_3392/v1740000000/common/f1/2026/track/2026track{{slug}}blackoutline.svg"
    detailed_url = f"https://media.formula1.com/image/upload/c_fit,h_704/q_auto/v1740000000/common/f1/2026/track/2026track{{slug}}detailed.webp"

    for race in schedule:
        slug = race.get('slug', '').lower()
        track_slug = SLUG_MAP.get(slug, slug.replace('-', ''))
        
        race['image'] = outline_url.format(slug=track_slug)
        race['detailedImage'] = detailed_url.format(slug=track_slug)

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(schedule, f, indent=4, ensure_ascii=False)
    
    print(f"Successfully patched 24 races with 2026 official slugs.")

if __name__ == "__main__":
    patch_2026_schedule()
