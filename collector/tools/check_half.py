import sqlite3
import os

db_path = r'c:\Users\jaymz\Desktop\oc\f1-collector\data\f1.db'
if not os.path.exists(db_path):
    db_path = r'c:\Users\jaymz\Desktop\oc\f1-website\public\data\f1.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Checking for half points (%.5) for McLaren...")
cursor.execute("""
    SELECT r.season, r.gp_name, rr.points 
    FROM race_results rr 
    JOIN races r ON rr.race_id = r.race_id 
    WHERE rr.team_id = 1 AND rr.points % 1 != 0
""")
half_pts = cursor.fetchall()
print(f"Half point races: {half_pts}")

# Calculate total points excluding 2007 (since user sees a high number, maybe it's the sum of stats?)
cursor.execute("SELECT SUM(points) FROM team_championships WHERE team_id = 1")
championship_sum = cursor.fetchone()[0] or 0
print(f"Total points in team_championships table: {championship_sum}")

# Check 2007 again
cursor.execute("SELECT SUM(points) FROM team_season_stats WHERE team_id = 1 AND season = 2007")
s2007 = cursor.fetchone()[0] or 0
print(f"Team Season Stats 2007 Points: {s2007}")

conn.close()
