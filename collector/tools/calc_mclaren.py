import sqlite3
import os

db_path = r'c:\Users\jaymz\Desktop\oc\f1-collector\data\f1.db'
if not os.path.exists(db_path):
    db_path = r'c:\Users\jaymz\Desktop\oc\f1-website\public\data\f1.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Find drivers
cursor.execute("SELECT driver_id, name_cn FROM drivers WHERE name_cn IN ('兰多·诺里斯', '丹尼尔·里卡多', '奥斯卡·皮亚斯特里')")
mclaren_drivers = cursor.fetchall()
print(f"Drivers: {mclaren_drivers}")
driver_ids = [d[0] for d in mclaren_drivers]

# Find sprint points for these drivers
placeholders = ', '.join(['?'] * len(driver_ids))
cursor.execute(f"SELECT SUM(points) FROM sprint_results WHERE driver_id IN ({placeholders})", driver_ids)
sprint_sum = cursor.fetchone()[0] or 0
print(f"Total Sprint Points for these drivers: {sprint_sum}")

# Total Race points (ID 1 + 98)
cursor.execute("SELECT SUM(points) FROM race_results WHERE team_id IN (1, 98)")
race_sum = cursor.fetchone()[0] or 0
print(f"Total Race Points (from results): {race_sum}")

# Check 2000 Austria deduction
print("\nChecking for 2000 Austria deduction (-10)...")
# Since it's a team penalty, it might be in team_championships but not race_results
cursor.execute("SELECT points FROM team_championships WHERE team_id=1 AND season=2000")
wcc_2000 = cursor.fetchone()[0]
cursor.execute("SELECT SUM(points) FROM race_results JOIN races ON race_results.race_id=races.race_id WHERE team_id=1 AND season=2000")
race_2000 = cursor.fetchone()[0]
print(f"2000 WCC Points: {wcc_2000}, 2000 Race results sum: {race_2000}")

conn.close()
