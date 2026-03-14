#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
扫描 1950-1959 年间每场比赛，推断最快圈得分车手，生成 CSV。
规则（图片说明：1950-1959 年积分制度）：
  标准正赛积分：1名=8, 2名=6, 3名=4, 4名=3, 5名=2, 其余=0
  额外最快圈加分：1分（仅计入车手，不计入车队）
推断方法：
  1. 若某车手积分有小数部分 → 最快圈 1 分被均分（可能与他人均分 → 各得 0.5）
  2. 若某车手积分是 9, 7, 5, 4, 3 (即正赛基础分 +1) → 他就是最快圈车手
  3. 若积分为 1（未进前五，但有 1 分纯粹是最快圈）→ 他就是最快圈车手
"""
import sqlite3
import csv
import os

db_path = os.path.join('public', 'data', 'f1.db')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

# 标准正赛基础分（1950-1959）
BASE_POINTS = {1: 8, 2: 6, 3: 4, 4: 3, 5: 2}

results = []

for season in range(1950, 1960):
    cur.execute("""
        SELECT DISTINCT r.race_id, r.round_number, c.name
        FROM race_results rr
        JOIN races r ON rr.race_id = r.race_id
        JOIN circuits c ON r.circuit_id = c.circuit_id
        WHERE r.season = ?
        ORDER BY r.round_number
    """, (season,))
    races = cur.fetchall()
    
    for race_id, round_num, circuit_name in races:
        cur.execute("""
            SELECT rr.driver_id, d.first_name, d.last_name, rr.position, rr.points
            FROM race_results rr
            JOIN drivers d ON rr.driver_id = d.driver_id
            WHERE rr.race_id = ?
            ORDER BY rr.position
        """, (race_id,))
        drivers = cur.fetchall()
        
        fl_holders = []  # 疑似最快圈的车手
        
        for driver_id, first_name, last_name, pos, points in drivers:
            if points is None:
                continue
            
            pos_val = int(pos) if pos else 999
            base = BASE_POINTS.get(pos_val, 0)
            
            # 方法 1：小数值（均分的最快圈）
            if points != int(points):
                # 小数，推断为最快圈 0.5 分
                fl_holders.append({
                    'season': season,
                    'round': round_num,
                    'circuit': circuit_name,
                    'driver_id': driver_id,
                    'driver': f"{first_name} {last_name}",
                    'position': pos_val,
                    'points_recorded': points,
                    'base_points': base,
                    'fl_points': points - base,
                    'note': '均分（小数）'
                })
            # 方法 2：整数但比基础分多 1（非前五但有 1 分 = 最快圈；或前五的 base+1 = 最快圈）
            elif points == base + 1 and points > 0:
                fl_holders.append({
                    'season': season,
                    'round': round_num,
                    'circuit': circuit_name,
                    'driver_id': driver_id,
                    'driver': f"{first_name} {last_name}",
                    'position': pos_val,
                    'points_recorded': points,
                    'base_points': base,
                    'fl_points': 1,
                    'note': '最快圈(整数+1)'
                })
            # 方法 3：名次不在前五但有 1 分（纯粹最快圈）
            elif base == 0 and points == 1:
                fl_holders.append({
                    'season': season,
                    'round': round_num,
                    'circuit': circuit_name,
                    'driver_id': driver_id,
                    'driver': f"{first_name} {last_name}",
                    'position': pos_val,
                    'points_recorded': points,
                    'base_points': 0,
                    'fl_points': 1,
                    'note': '最快圈(前五外1分)'
                })
        
        # 如果没有找到最快圈，记录一个空条目
        if not fl_holders:
            results.append({
                'season': season,
                'round': round_num,
                'circuit': circuit_name,
                'driver_id': '',
                'driver': '未能推断',
                'position': '',
                'points_recorded': '',
                'base_points': '',
                'fl_points': '',
                'note': '无法识别（需要手动确认）'
            })
        else:
            results.extend(fl_holders)

conn.close()

# 写入 CSV
output_path = os.path.join('csv', 'fastest_lap_1950_1959.csv')
fieldnames = ['season', 'round', 'circuit', 'driver_id', 'driver', 'position', 
              'points_recorded', 'base_points', 'fl_points', 'note']

with open(output_path, 'w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(results)

print(f"[OK] 已生成 {output_path}")
print(f"共找到 {len(results)} 条疑似最快圈记录（含无法推断条目）")
print(f"\n各年度最快圈推断情况：")
from collections import Counter
by_year = Counter(r['season'] for r in results)
for yr in range(1950, 1960):
    print(f"  {yr}: {by_year.get(yr, 0)} 条")

# 显示无法推断的
no_infer = [r for r in results if r['note'] == '无法识别（需要手动确认）']
print(f"\n⚠️  无法自动推断的场次: {len(no_infer)} 场")
for r in no_infer:
    print(f"  {r['season']} 第{r['round']}Station - {r['circuit']}")
