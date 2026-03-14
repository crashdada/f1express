import sqlite3
import os

db_path = r'c:\Users\jaymz\Desktop\oc\f1-collector\data\f1.db'
if not os.path.exists(db_path):
    # Try website path if collector path doesn't exist
    db_path = r'c:\Users\jaymz\Desktop\oc\f1-website\public\data\f1.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# 1. Find McLaren ID
cursor.execute("SELECT team_id, name FROM teams WHERE name LIKE '%McLaren%'")
teams = cursor.fetchall()
print(f"Found McLaren teams: {teams}")

mclaren_ids = [t[0] for t in teams]
placeholders = ', '.join(['?'] * len(mclaren_ids))

# 2. Sum points from race_results
query_total = f"SELECT SUM(points) FROM race_results WHERE team_id IN ({placeholders})"
cursor.execute(query_total, mclaren_ids)
total_points = cursor.fetchone()[0]
print(f"Total points from race_results: {total_points}")

# 3. Sum points from sprint_results (if any)
try:
    query_sprint = f"SELECT SUM(points) FROM sprint_results WHERE team_id IN ({placeholders})"
    cursor.execute(query_sprint, mclaren_ids)
    sprint_points = cursor.fetchone()[0] or 0
    print(f"Total points from sprint_results: {sprint_points}")
except:
    sprint_points = 0
    print("No sprint_results table or error.")

# 4. Check for special events adjustments
try:
    cursor.execute("SELECT season, points_adjustment, reason FROM team_season_stats WHERE team_id IN ({placeholders}) AND points_adjustment != 0".replace('{placeholders}', placeholders), mclaren_ids)
    adjustments = cursor.fetchall()
    print(f"Adjustments found in team_season_stats: {adjustments}")
except:
    print("Could not query adjustments in team_season_stats")

# 5. Check WCC points sum
query_wcc = f"SELECT SUM(points) FROM team_championships WHERE team_id IN ({placeholders})"
cursor.execute(query_wcc, mclaren_ids)
wcc_total = cursor.fetchone()[0]
print(f"Total points from team_championships: {wcc_total}")

conn.close()
