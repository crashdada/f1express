import sqlite3
import os

db_path = r'c:\Users\jaymz\Desktop\oc\f1-collector\data\f1.db'
if not os.path.exists(db_path):
    db_path = r'c:\Users\jaymz\Desktop\oc\f1-website\public\data\f1.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT team_id, name FROM teams WHERE name LIKE '%McLaren%' OR name LIKE '%迈凯伦%'")
teams = cursor.fetchall()
print(f"Teams: {teams}")

all_ids = [t[0] for t in teams]
placeholders = ', '.join(['?'] * len(all_ids))

# 1. Race points
cursor.execute(f"SELECT SUM(points) FROM race_results WHERE team_id IN ({placeholders})", all_ids)
race_total = cursor.fetchone()[0] or 0

# 2. Sprint points - find drivers who scored in a sprint and check their team in race_results for that GP
# (Because sprint_results doesn't have team_id)
cursor.execute(f"""
    SELECT SUM(sr.points)
    FROM sprint_results sr
    JOIN sprint_races s ON sr.sprint_race_id = s.sprint_race_id
    JOIN races r ON s.season = r.season AND s.round_number = r.round_number
    JOIN race_results rr ON r.race_id = rr.race_id AND sr.driver_id = rr.driver_id
    WHERE rr.team_id IN ({placeholders})
""", all_ids)
sprint_total = cursor.fetchone()[0] or 0

print(f"Total Race Points: {race_total}")
print(f"Total Sprint Points: {sprint_total}")
print(f"Combined Sum: {race_total + sprint_total}")

conn.close()
