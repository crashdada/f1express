import sqlite3
import sys
from pathlib import Path

TOOLS_ROOT = Path(__file__).resolve().parents[1]
if str(TOOLS_ROOT) not in sys.path:
    sys.path.append(str(TOOLS_ROOT))

from _shared import resolve_db_path

db_path = resolve_db_path(__file__)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Find team_id for '迈凯伦'
cursor.execute("SELECT team_id FROM teams WHERE name = '迈凯伦'")
team_id = cursor.fetchone()[0]

print(f"Checking for fractional points for team_id {team_id}...")
cursor.execute(f"SELECT season, points FROM race_results JOIN races ON race_results.race_id = races.race_id WHERE team_id = {team_id}")
all_pts = cursor.fetchall()
fractions = [p for p in all_pts if p[1] != int(p[1])]
for f in fractions:
    print(f)

print(f"Total Fractional Points: {sum(f[1] for f in fractions)}")
conn.close()
