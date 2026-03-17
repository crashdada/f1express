import requests
from bs4 import BeautifulSoup
import json
import os
import re

def scrape_f1_numbers():
    print("Fetching F1 drivers page...")
    url = "https://www.formula1.com/en/drivers"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
    }
    
    try:
        session = requests.Session()
        response = session.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"Error fetching page: {e}")
        return

    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Based on the latest inspection, driver data is in cards.
    driver_cards = soup.select('a[href*="/en/drivers/"]')
    print(f"Found {len(driver_cards)} driver cards.")
    
    scraped_data = {}
    
    for card in driver_cards:
        try:
            # Extract names - they are usually in separate <p> or <span> tags
            names = [p.get_text(strip=True) for p in card.find_all(['p', 'span']) if p.get_text(strip=True)]
            if len(names) < 2: continue
            
            full_name = f"{names[0]} {names[1]}" # First Last
            
            # Find the number
            all_text = card.get_text(" ", strip=True)
            nums = re.findall(r'\b\d{1,2}\b', all_text)
            if nums:
                for n in nums:
                    num_val = int(n)
                    if 1 <= num_val <= 99:
                        scraped_data[full_name] = num_val
                        # print(f"Matched: {full_name} -> {num_val}")
                        break
        except:
            continue

    if not scraped_data:
        print("Warning: Automatic scraping with 'requests' failed (likely due to JS rendering).")
        print("Please check apply_number_updates.py for the latest verified data.")
        return

    # Update config
    config_path = os.path.join("data", "drivers_config_2026.json")
    if not os.path.exists(config_path):
        print(f"Config file {config_path} not found.")
        return

    with open(config_path, 'r', encoding='utf-8') as f:
        drivers_config = json.load(f)

    updates_made = 0
    for driver in drivers_config:
        full_name = f"{driver['firstName']} {driver['lastName']}"
        if full_name in scraped_data:
            new_val = scraped_data[full_name]
            old_val = driver.get('number')
            
            if old_val != new_val:
                print(f"Updating {full_name}: {old_val} -> {new_val}")
                if 'history' not in driver: driver['history'] = {}
                if 'numbers' not in driver['history']: driver['history']['numbers'] = []
                
                if old_val and old_val not in driver['history']['numbers']:
                    driver['history']['numbers'].append(old_val)
                
                driver['number'] = new_val
                updates_made += 1

    if updates_made > 0:
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(drivers_config, f, indent=4, ensure_ascii=False)
        print(f"Successfully updated {updates_made} driver numbers. History preserved.")
    else:
        print("No updates needed according to scraped data.")

if __name__ == "__main__":
    scrape_f1_numbers()
