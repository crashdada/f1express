import sqlite3
import os

db_path = r'c:\Users\jaymz\Desktop\oc\f1-collector\data\f1.db'
if not os.path.exists(db_path):
    db_path = r'c:\Users\jaymz\Desktop\oc\f1-website\public\data\f1.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("Finding all fractional points for McLaren (team_id 1)...")
cursor.execute("""
    SELECT r.season, r.gp_name, d.first_name, d.last_name, rr.points 
    FROM race_results rr 
    JOIN races r ON rr.race_id = r.race_id 
    JOIN drivers d ON rr.driver_id = d.driver_id
    WHERE rr.team_id = 1 AND rr.points != CAST(rr.points AS INTEGER)
""")
results = cursor.fetchall()
for r in results:
    print(r)

print("\nSum of these fractional results:", sum(r[4] for r in results))
conn.close()
