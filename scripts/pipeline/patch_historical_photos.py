"""
Patch historical driver photos from the archive/ directory into the database.

Matching strategy (multi-pass, most-specific → least-specific):
  1. Exact normalized match:  (STRIPPED_FNAME, STRIPPED_LNAME)
  2. Alias / alternative-name map for known mismatches
  3. Fuzzy: strip hyphens → underscores, ignore case, try various splits
"""
import sqlite3
import os
import unicodedata
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import get_path, ensure_dirs


def strip_accents(s: str) -> str:
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                  if unicodedata.category(c) != 'Mn')


def normalize(s: str) -> str:
    """Lowercase, strip accents, hyphens → underscores."""
    return strip_accents(s).lower().replace('-', '_').replace(' ', '_')


# Manual alias map: DB (first_name, last_name) → archive filename (without .webp)
# For cases where the archive uses a different name than the database
MANUAL_ALIASES: dict[tuple[str, str], str] = {
    ("Nino", "Farina"): "FARINA_Giuseppe",
    ("Manny", "Ayulo"): "AYULO_Manuel",
    ("Paco", "Godia"): "GODIA-SALES_Francisco",
    ("Jyrki", "Jarvilehto"): "LEHTO_JJ",
    ("Nelson", "Piquet JR"): "PIQUET_Nelsinho",
    ("Toulo", "de Graffenried"): "de_GRAFFENRIED_Emmanuel",
    ("Oscar Alfredo", "Galvez"): "GALVEZ_Oscar",
}


def parse_archive_filename(filename: str) -> tuple[str, str]:
    """
    Parse archive filename into (first_name_parts, last_name_parts).
    Handle complex patterns like:
      VETTEL_Sebastian.webp          → (Sebastian, Vettel)
      de_la_ROSA_Pedro.webp          → (Pedro, de la Rosa)
      GODIN_de_BEAUFORT_Carel.webp   → (Carel, Godin de Beaufort)
      von_TRIPS_Wolfgang.webp        → (Wolfgang, von Trips)
      MONTOYA_Juan-Pablo.webp        → (Juan Pablo, Montoya)
      da_SILVA_RAMOS_Hermano.webp    → (Hermano, da Silva Ramos)
      ZHOU_Guanyu.webp               → (Guanyu, Zhou)
      De_ADAMICH_Andrea.webp         → (Andrea, De Adamich)

    Strategy: the LAST underscore-separated token that starts with lowercase
    or the last token overall is the first name. Everything before is surname.
    But particles (de, da, di, van, von, De, le, La) are part of surname.
    """
    name_part = filename.rsplit('.', 1)[0]  # remove .webp
    tokens = name_part.split('_')

    if len(tokens) == 1:
        return ("", tokens[0])

    # The first name is at the end; scan from right to find where it starts
    # First name tokens: not all-uppercase AND not a name particle
    particles = {'de', 'da', 'di', 'du', 'van', 'von', 'le', 'la', 'del', 'dos', 'das'}

    # Find the boundary: last name is everything from the start up to
    # the point where we hit the first-name portion
    # First name = rightmost consecutive tokens that are NOT all uppercase
    #              and NOT particles
    first_name_tokens = []
    surname_tokens = list(tokens)

    # Walk from right: collect first-name tokens
    while surname_tokens:
        last = surname_tokens[-1]
        # If it's all uppercase or a particle, it's part of surname
        if last == last.upper() and len(last) > 1:
            break
        if last.lower() in particles:
            break
        first_name_tokens.insert(0, surname_tokens.pop())

    if not first_name_tokens:
        # Fallback: last token is first name
        first_name_tokens = [surname_tokens.pop()]

    first = ' '.join(t.replace('-', ' ') for t in first_name_tokens)
    last = ' '.join(t.replace('-', ' ') for t in surname_tokens)

    return (first.strip(), last.strip())


def patch_historical_photos():
    ensure_dirs()
    db_path = str(get_path('db'))
    archive_dir = get_path('photos') / 'archive'

    if not os.path.exists(archive_dir):
        print(f"[SKIP] Archive directory not found: {archive_dir}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Load all drivers into memory
    cursor.execute('SELECT driver_id, first_name, last_name FROM drivers')
    drivers = cursor.fetchall()

    # Build multiple lookup maps for flexible matching
    # Map 1: normalized (first, last) → driver_id
    driver_map_norm: dict[tuple[str, str], int] = {}
    # Map 2: normalized "first_last" flat key → driver_id
    driver_map_flat: dict[str, int] = {}

    for did, fname, lname in drivers:
        nf = normalize(fname)
        nl = normalize(lname)
        driver_map_norm[(nf, nl)] = did
        driver_map_flat[f"{nf}_{nl}"] = did

    print("Mapping historical photos from archive/ to database (multi-pass matching)...")

    files = [f for f in os.listdir(archive_dir) if f.lower().endswith('.webp')]
    count = 0
    not_found = 0
    matched_details = []

    for filename in files:
        did = None
        match_method = ""

        # --- Pass 1: Parse filename and do normalized match ---
        first, last = parse_archive_filename(filename)
        if first and last:
            nf = normalize(first)
            nl = normalize(last)
            did = driver_map_norm.get((nf, nl))
            if did:
                match_method = "parsed"

        # --- Pass 2: Simple split on first underscore (legacy logic) ---
        if not did:
            name_part = filename.rsplit('.', 1)[0]
            if '_' in name_part:
                surname, firstname = name_part.split('_', 1)
                firstname = firstname.replace('_', ' ').replace('-', ' ')
                nf = normalize(firstname)
                nl = normalize(surname)
                did = driver_map_norm.get((nf, nl))
                if did:
                    match_method = "legacy_split"

        # --- Pass 3: Flat normalized key (all parts joined) ---
        if not did:
            name_part = filename.rsplit('.', 1)[0]
            flat_key = normalize(name_part)
            # Try matching by checking if any driver's flat key is a subset
            for dkey, d_id in driver_map_flat.items():
                # Check both orderings
                parts_file = set(flat_key.split('_'))
                parts_driver = set(dkey.split('_'))
                if parts_file == parts_driver:
                    did = d_id
                    match_method = "flat_set"
                    break

        if did:
            url = f"/photos/archive/{filename}"
            cursor.execute('INSERT OR REPLACE INTO driver_photos (driver_id, url) VALUES (?, ?)', (did, url))
            count += 1
        else:
            not_found += 1

    # --- Pass 4: Manual aliases for known mismatches ---
    alias_count = 0
    for (fname, lname), archive_name in MANUAL_ALIASES.items():
        cursor.execute('SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?', (fname, lname))
        row = cursor.fetchone()
        if not row:
            continue
        did = row[0]
        target_file = f"{archive_name}.webp"
        if target_file in files:
            url = f"/photos/archive/{target_file}"
            cursor.execute('INSERT OR REPLACE INTO driver_photos (driver_id, url) VALUES (?, ?)', (did, url))
            alias_count += 1

    conn.commit()
    conn.close()
    print(f"[OK] Patched {count} archive photos + {alias_count} manual aliases. ({not_found} archive files not matched)")


if __name__ == "__main__":
    patch_historical_photos()
