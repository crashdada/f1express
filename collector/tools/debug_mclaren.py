import sqlite3
import os

db_path = r'c:\Users\jaymz\Desktop\oc\f1-collector\data\f1.db'
if not os.path.exists(db_path):
    db_path = r'c:\Users\jaymz\Desktop\oc\f1-website\public\data\f1.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Find all team_ids related to McLaren (including Chinese and English names)
cursor.execute("SELECT team_id, name FROM teams WHERE name LIKE '%迈凯伦%' OR name LIKE '%McLaren%'")
teams = cursor.fetchall()
print(f"Target Teams: {teams}")
mclaren_ids = [t[0] for t in teams]

# 1. Base points from race_results (individual results)
placeholders = ', '.join(['?'] * len(mclaren_ids))
query_base = f"SELECT SUM(points) FROM race_results WHERE team_id IN ({placeholders})"
cursor.execute(query_base, mclaren_ids)
base_points = cursor.fetchone()[0] or 0
print(f"Base Race Points (Sum of results): {base_points}")

# 2. Sprint points
try:
    query_sprint = f"SELECT SUM(points) FROM sprint_results WHERE team_id IN ({placeholders})"
    cursor.execute(query_sprint, mclaren_ids)
    sprint_points = cursor.fetchone()[0] or 0
    print(f"Sprint Points: {sprint_points}")
except:
    sprint_points = 0
    print("Sprint table error.")

# 3. Points Adjustments from team_season_stats
# Note: Spygate -218, Austria 2000 -10
try:
    query_adj = f"SELECT SUM(points_adjustment) FROM team_season_stats WHERE team_id IN ({placeholders})"
    cursor.execute(query_adj, mclaren_ids)
    adjustments = cursor.fetchone()[0] or 0
    print(f"Total Points Adjustments: {adjustments}")
    
    # Detailed adjustments
    cursor.execute(f"SELECT season, points_adjustment, reason FROM team_season_stats WHERE team_id IN ({placeholders}) AND points_adjustment != 0", mclaren_ids)
    details = cursor.fetchall()
    for d in details:
        print(f"  Adjustment Detail: {d}")
except Exception as e:
    print(f"Adjustments query failed: {e}")
    adjustments = 0

total = base_points + sprint_points + adjustments
print(f"\nCalculated Total: {total}")

# 4. Compare with the score user saw (8028.5)
diff = total - 8028.5
print(f"Difference from reported: {diff}")

conn.close()
