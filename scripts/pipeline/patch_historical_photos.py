import sqlite3
import os
import json
import unicodedata

import sys
from pathlib import Path

# Add parent directory to sys.path to import f1_config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import get_path, ensure_dirs

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                  if unicodedata.category(c) != 'Mn')

def patch_historical_photos():
    ensure_dirs()
    db_path = str(get_path('db'))
    archive_dir = get_path('photos') / 'archive'
    
    if not os.path.exists(archive_dir):
        print(f"[SKIP] Archive directory not found: {archive_dir}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Load all drivers into memory for faster matching with accent stripping
    cursor.execute('SELECT driver_id, first_name, last_name FROM drivers')
    drivers = cursor.fetchall()
    
    driver_map = {}
    for did, fname, lname in drivers:
        # Create a normalized key: (STRIPPED_FNAME, STRIPPED_LNAME)
        key = (strip_accents(fname).upper(), strip_accents(lname).upper())
        driver_map[key] = did

    print("Mapping historical photos from archive/ to database (with accent stripping)...")
    
    files = [f for f in os.listdir(archive_dir) if f.lower().endswith('.webp')]
    count = 0
    not_found = 0
    
    for filename in files:
        # Expected format: SURNAME_Firstname.webp
        name_part = filename.rsplit('.', 1)[0]
        if '_' not in name_part:
            surname = name_part
            firstname = ""
        else:
            surname, firstname = name_part.split('_', 1)
        
        firstname = firstname.replace('_', ' ')
        
        # Match using normalized map
        # Note: Archive filenames often have SURNAME first
        # Try both (First, Last) and (Last, First) just in case
        key1 = (strip_accents(firstname).upper(), strip_accents(surname).upper())
        
        did = driver_map.get(key1)
        
        if did:
            url = f"/photos/archive/{filename}"
            # Don't overwrite if it already exists (might be a custom higher quality photo)
            cursor.execute('SELECT url FROM driver_photos WHERE driver_id = ?', (did,))
            current = cursor.fetchone()
            
            if not current or current[0].startswith('/photos/archive/'):
                cursor.execute('INSERT OR REPLACE INTO driver_photos (driver_id, url) VALUES (?, ?)', (did, url))
                count += 1
        else:
            not_found += 1

    conn.commit()
    conn.close()
    print(f"[OK] Patched {count} historical driver photos. ({not_found} files not matched)")

if __name__ == "__main__":
    patch_historical_photos()
