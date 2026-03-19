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

mclaren_ids = [1, 98]

# Sum points from team_season_stats
cursor.execute("SELECT SUM(points) FROM team_season_stats WHERE team_id IN (1, 98)")
tss_sum = cursor.fetchone()[0] or 0
print(f"Total Points in team_season_stats: {tss_sum}")

# Detailed 2007 check
cursor.execute("SELECT points FROM team_season_stats WHERE team_id=1 AND season=2007")
v2007 = cursor.fetchone()[0] or 0
print(f"2007 Season Stats Points: {v2007}")

# Check 2009 (Malaysia half points)
cursor.execute("SELECT points FROM team_season_stats WHERE team_id=1 AND season=2009")
v2009 = cursor.fetchone()[0] or 0
print(f"2009 Season Stats Points: {v2009}")

conn.close()
