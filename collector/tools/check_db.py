import sqlite3
import os

db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                       '..', 'f1-website', 'public', 'data', 'f1.db')

conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 2026 races
cur.execute("SELECT * FROM races WHERE season = 2026")
races = cur.fetchall()
print(f"2026 races: {len(races)}")
for r in races:
    print(f"  {r}")

# 2026 race results
if races:
    race_id = races[0][0]
    cur.execute("""
        SELECT rr.position, d.first_name, d.last_name, d.code, t.name, rr.points, rr.status
        FROM race_results rr
        JOIN drivers d ON rr.driver_id = d.driver_id
        LEFT JOIN teams t ON rr.team_id = t.team_id
        WHERE rr.race_id = ?
        ORDER BY CASE WHEN rr.position IS NULL THEN 999 ELSE rr.position END
    """, (race_id,))
    
    print(f"\n2026 R1 Results (race_id={race_id}):")
    rows = cur.fetchall()
    print(f"  Total: {len(rows)} entries")
    for row in rows:
        pos = row[0] if row[0] else 'NC'
        team = row[4] or '???'
        print(f"  P{str(pos):>3} | {row[1]+' '+row[2]:<25} ({row[3]}) | {team:<20} | {row[5]:>5} pts | {row[6]}")

# Circuit info
cur.execute("""
    SELECT c.name, c.country 
    FROM races r JOIN circuits c ON r.circuit_id = c.circuit_id 
    WHERE r.season = 2026
""")
print(f"\nCircuit: {cur.fetchone()}")

conn.close()
