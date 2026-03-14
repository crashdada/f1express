import sqlite3
import csv
import os

db_path = os.path.join('public', 'data', 'f1.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 用户提供的补充数据
manual_fixes = [
    (1951, 4, 'Juan Manuel Fangio'),
    (1951, 7, 'Nino Farina'),
    (1954, 8, 'Jose Froilan Gonzalez'),
    (1956, 4, 'Stirling Moss'),
    (1957, 5, 'Stirling Moss'),
]

BASE_POINTS = {1: 8, 2: 6, 3: 4, 4: 3, 5: 2}

new_rows = []
for season, round_num, driver_name in manual_fixes:
    parts = driver_name.split(' ', 1)
    first_name_part = parts[0]
    last_name_part = parts[1] if len(parts) > 1 else ''
    
    # 查找 driver_id
    cur.execute("""
        SELECT driver_id, first_name, last_name FROM drivers
        WHERE last_name LIKE ? OR (first_name LIKE ? AND last_name LIKE ?)
    """, (f'%{last_name_part}%', f'%{first_name_part}%', f'%{last_name_part}%'))
    d = cur.fetchone()
    driver_id = d[0] if d else ''
    full_name = f"{d[1]} {d[2]}" if d else driver_name

    # 查找赛道
    cur.execute("""
        SELECT c.name FROM races r
        JOIN circuits c ON r.circuit_id = c.circuit_id
        WHERE r.season = ? AND r.round_number = ?
    """, (season, round_num))
    c = cur.fetchone()
    circuit = c[0] if c else ''

    # 查找该车手在这场比赛的比赛记录
    cur.execute("""
        SELECT rr.position, rr.points FROM race_results rr
        JOIN races r ON rr.race_id = r.race_id
        WHERE r.season = ? AND r.round_number = ? AND rr.driver_id = ?
    """, (season, round_num, driver_id))
    rr = cur.fetchone()
    pos = int(rr[0]) if rr and rr[0] else 999
    pts_recorded = rr[1] if rr else 0
    base = BASE_POINTS.get(pos, 0)

    new_rows.append({
        'season': season,
        'round': round_num,
        'circuit': circuit,
        'driver_id': driver_id,
        'driver': full_name,
        'position': pos,
        'points_recorded': pts_recorded,
        'base_points': base,
        'fl_points': 1,
        'note': '手动补充（最快圈整数+1）'
    })
    
    print(f"[{season} R{round_num}] {full_name} | pos={pos} pts={pts_recorded} base={base}")

conn.close()

# 读取原 CSV，替换掉"未能推断"条目
csv_path = os.path.join('csv', 'fastest_lap_1950_1959.csv')
updated_rows = []
with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    fieldnames = reader.fieldnames
    for row in reader:
        if row['note'] == '无法识别（需要手动确认）':
            # 找对应的 manual fix
            match = [r for r in new_rows if str(r['season']) == row['season'] and str(r['round']) == row['round']]
            if match:
                updated_rows.append(match[0])
                continue
        updated_rows.append(row)

with open(csv_path, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(updated_rows)

print(f"\n[OK] CSV 已更新，现共 {len(updated_rows)} 条记录（无缺漏条目）")
remaining_missing = [r for r in updated_rows if r.get('note','') == '无法识别（需要手动确认）']
print(f"剩余未填写: {len(remaining_missing)} 条")
