import sqlite3
import os

db_path = r'c:\Users\jaymz\Desktop\oc\f1-collector\data\f1.db'
if not os.path.exists(db_path):
    db_path = r'c:\Users\jaymz\Desktop\oc\f1-website\public\data\f1.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

mclaren_ids = [1, 98] # 1: 迈凯伦, 98: McLaren BRM

print(f"{'Year':<6} | {'Race Pts':<10} | {'Sprint Pts':<10} | {'WCC Pts':<10}")
print("-" * 45)

total_race = 0
total_sprint = 0

for year in range(1950, 2026):
    # Race results
    cursor.execute("""
        SELECT SUM(rr.points) 
        FROM race_results rr
        JOIN races r ON rr.race_id = r.race_id
        WHERE rr.team_id IN (1, 98) AND r.season = ?
    """, (year,))
    rp = cursor.fetchone()[0] or 0
    
    # Sprint results
    try:
        cursor.execute("""
            SELECT SUM(sr.points) 
            FROM sprint_results sr
            JOIN sprint_races s ON sr.sprint_race_id = s.sprint_race_id
            WHERE sr.team_id IN (1, 98) AND s.season = ?
        """, (year,))
        sp = cursor.fetchone()[0] or 0
    except:
        sp = 0
        
    # WCC total from championship table
    cursor.execute("SELECT points FROM team_championships WHERE team_id IN (1, 98) AND season = ?", (year,))
    rows = cursor.fetchall()
    wp = sum([r[0] for r in rows]) if rows else 0
    
    if rp > 0 or sp > 0 or wp > 0:
        print(f"{year:<6} | {rp:<10.1f} | {sp:<10.1f} | {wp:<10.1f}")
        total_race += rp
        total_sprint += sp

print("-" * 45)
print(f"{'TOTAL':<6} | {total_race:<10.1f} | {total_sprint:<10.1f} |")
print(f"Grand Total (Race + Sprint): {total_race + total_sprint}")

conn.close()
