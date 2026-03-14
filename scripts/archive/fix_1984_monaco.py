import sqlite3
import os

db_path = os.path.join("f1-website", "public", "data", "f1.db")
print(f"Connecting to database: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get Race ID for 1984 Monaco
cursor.execute("SELECT race_id FROM races WHERE season = 1984 AND round_number = 6")
race_id = cursor.fetchone()[0]

print(f"Fixing Race ID: {race_id} (1984 Monaco GP)")

# P1: Prost (9 -> 4.5)
cursor.execute("UPDATE race_results SET points = 4.5 WHERE race_id = ? AND position = 1", (race_id,))
print(f"Updated P1 (Prost) -> 4.5 (Affected: {cursor.rowcount})")

# P4: Keke Rosberg (3 -> 1.5)
cursor.execute("UPDATE race_results SET points = 1.5 WHERE race_id = ? AND position = 4", (race_id,))
print(f"Updated P4 (Keke Rosberg) -> 1.5 (Affected: {cursor.rowcount})")

# P6: Alboreto (1 -> 0.5)
cursor.execute("UPDATE race_results SET points = 0.5 WHERE race_id = ? AND position = 6", (race_id,))
print(f"Updated P6 (Alboreto) -> 0.5 (Affected: {cursor.rowcount})")

conn.commit()
conn.close()

print("Fix applied successfully. Now verifying Prost's total...")

# Recalculate manually just to verify
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT driver_id FROM drivers WHERE last_name = 'Prost'")
did = cursor.fetchone()[0]
cursor.execute("SELECT SUM(points) FROM race_results WHERE driver_id = ?", (did,))
print(f"New Raw Total for Prost: {cursor.fetchone()[0]}")
conn.close()
