import json
import requests

def test_missing():
    with open('data/schedule_2026.json', 'r', encoding='utf-8') as f:
        schedule = json.load(f)
    
    targets = ['monaco', 'barcelona-catalunya', 'belgium', 'spain', 'emilia-romagna', 'brazil']
    
    for race in schedule:
        slug = race.get('slug')
        if slug in targets:
            print(f"\n--- {slug} (Round {race.get('roundNumber')}) ---")
            img = race.get('image', '')
            det = race.get('detailedImage', '')
            print(f"Outline: {img}")
            print(f"Detailed: {det}")
            
            if img.startswith('http'):
                r = requests.head(img)
                print(f"Outline Status: {r.status_code}")
            if det.startswith('http'):
                r = requests.head(det)
                print(f"Detailed Status: {r.status_code}")

if __name__ == "__main__":
    test_missing()
