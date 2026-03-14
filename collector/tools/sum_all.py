import sqlite3
import os

db_path = r'c:\Users\jaymz\Desktop\oc\f1-collector\data\f1.db'
if not os.path.exists(db_path):
    db_path = r'c:\Users\jaymz\Desktop\oc\f1-website\public\data\f1.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

mclaren_ids = [1, 98]

# 1. Total Race Points
cursor.execute("SELECT SUM(points) FROM race_results WHERE team_id IN (1, 98)")
race_sum = cursor.fetchone()[0] or 0

# 2. Total Sprint Points (Calculated by drivers who drove for McLaren in specific years)
# Sprint scoring years: 2021-2025
# McLaren drivers: 
# 2021: Norris (15?), Ricciardo (22?)
# 2022: Norris, Ricciardo
# 2023: Norris, Piastri (80?)
# 2024: Norris, Piastri
# 2025: Norris, Piastri

# Let's just find all drivers who EVER scored for team_id 1 in a sprint
cursor.execute("SELECT SUM(points) FROM sprint_results WHERE team_id IN (1, 98)")
sprint_sum_direct = cursor.fetchone()[0] or 0

# If team_id is missing in sprint_results (as I suspect), let's join with race_results to find the team at each race
# Actually, let's look at how the recalculate_stats.py does it.
# It probably uses a map or joins.

# Let's try to sum points and group by year to see the breakdown manually.
print(f"Total Race Sum: {race_sum}")
print(f"Total Sprint Sum (Direct): {sprint_sum_direct}")

# Check the '8028.5' sum
# Could it be Race Points + Adjustments?
# 7957.0 (Race) + 71.5 (missing?) = 8028.5

# Let's count McLaren sprint points manually from official records or by checking sprint_results
# 2021: 
#   GB: Ricciardo(6th->0), Norris(5th->0) - Only top 3 scored
#   Italy: Ricciardo(3rd->1), Norris(4th->0)
#   Brazil: Norris(6th->0), Ricciardo(11th->0)
#   Total 2021 Sprint: 1
# 2022:
#   Imola: Norris(5th->4), Ricciardo(6th->3) = 7
#   Austria: Norris(11th->0), Ricciardo(12th->0) = 0
#   Brazil: Norris(7th->2), Ricciardo(11th->0) = 2
#   Total 2022 Sprint: 9
# 2023:
#   Azerbaijan: Norris(17th->0), Piastri(10th->0)
#   Austria: Norris(9th->0), Piastri(11th->0)
#   Belgium: Piastri(2nd->7), Norris(6th->3) = 10
#   Qatar: Piastri(1st->8), Norris(3rd->6) = 14
#   USA: Norris(4th->5), Piastri(DNF->0) = 5
#   Brazil: Norris(2nd->7), Piastri(10th->0) = 7
#   Total 2023 Sprint: 36
# 2024:
#   ... this gets complex.
# But 1 + 9 + 36 = 46. Adding 2024/2025 will be more.

# Let's just sum ALL sprint points in the DB and see if that helps
cursor.execute("SELECT SUM(points) FROM sprint_results")
all_sprint = cursor.fetchone()[0] or 0
print(f"All Sprint Points in DB: {all_sprint}")

conn.close()
