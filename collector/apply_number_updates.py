import json
import os

def update_config_with_history():
    # Data scraped from official site
    web_data = {
        "Lando Norris": 1,
        "Max Verstappen": 3,
        "Gabriel Bortoleto": 5,
        "Isack Hadjar": 6,
        "Pierre Gasly": 10,
        "Sergio Perez": 11,
        "Kimi Antonelli": 12,
        "Fernando Alonso": 14,
        "Charles Leclerc": 16,
        "Lance Stroll": 18,
        "Alexander Albon": 23,
        "Nico Hulkenberg": 27,
        "Liam Lawson": 30,
        "Esteban Ocon": 31,
        "Arvid Lindblad": 41,
        "Franco Colapinto": 43,
        "Lewis Hamilton": 44,
        "Carlos Sainz": 55,
        "George Russell": 63,
        "Valtteri Bottas": 77,
        "Oscar Piastri": 81,
        "Oliver Bearman": 87
    }

    config_path = os.path.join("data", "drivers_config_2026.json")
    with open(config_path, 'r', encoding='utf-8') as f:
        drivers = json.load(f)

    updated_count = 0
    for driver in drivers:
        name = f"{driver['firstName']} {driver['lastName']}"
        if name in web_data:
            new_num = web_data[name]
            old_num = driver.get('number')
            
            if old_num != new_num:
                print(f"Updating {name}: {old_num} -> {new_num}")
                
                # Initialize history if missing
                if 'history' not in driver:
                    driver['history'] = {}
                if 'numbers' not in driver['history']:
                    driver['history']['numbers'] = []
                
                # Add old number to history if not already there
                if old_num and old_num not in driver['history']['numbers']:
                    driver['history']['numbers'].append(old_num)
                
                driver['number'] = new_num
                updated_count += 1

    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(drivers, f, indent=4, ensure_ascii=False)
    
    print(f"Finished. Updated {updated_count} driver numbers and preserved history.")

if __name__ == "__main__":
    update_config_with_history()
