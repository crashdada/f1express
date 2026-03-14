#!/usr/bin/env python3
"""
第 8 步：应用特殊历史事件修正 (Apply Special Events)
从 special_events.json 读取规则并对数据库进行永久性修正。
主要处理：
1. 积分手动加成 (points_additions)
2. 车队 ID 合并 (team_id_merges)
"""
import sqlite3
import os
import json

def apply_special_events():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    db_path = os.path.join(base_dir, 'public', 'data', 'f1.db')
    json_path = os.path.join(os.path.dirname(__file__), 'special_events.json')

    if not os.path.exists(db_path):
        print(f"  [Error] 数据库不存在: {db_path}")
        return
    if not os.path.exists(json_path):
        print(f"  [SKIP] 配置文件不存在: {json_path}")
        return

    print(f"  正在从 {os.path.basename(json_path)} 应用永久性数据库修正...")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    with open(json_path, 'r', encoding='utf-8') as f:
        events = json.load(f)

    # 1. 应用积分加成 (Points Additions)
    # 处理 CSV 中缺失或需要手动调整的原始分数
    additions = events.get('points_additions', [])
    if additions:
        print(f"  -> 应用 {len(additions)} 条积分修正规则...")
        for add in additions:
            yr = add.get('year')
            rnd = add.get('round')
            pts = add.get('added_points')
            driver = add.get('driver')
            parts = driver.split(' ', 1)
            fname, lname = parts[0], parts[1] if len(parts) > 1 else ''

            cursor.execute('''
                UPDATE race_results
                SET points = COALESCE(points, 0) + ?
                WHERE race_id = (SELECT race_id FROM races WHERE season = ? AND round_number = ?)
                  AND driver_id = (SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?)
            ''', (pts, yr, rnd, fname, lname))

    # 2. 合并车队 ID (Team ID Merges)
    # 处理历史重名、引擎供应商变体或合并实体的 ID 统一
    merges = events.get('team_id_merges', [])
    if merges:
        print(f"  -> 应用 {len(merges)} 条车队 ID 合并规则...")
        for m in merges:
            fid, tid = m['from'], m['to']
            reason = m.get('reason', 'Merged history')
            
            # 更新正赛表
            cursor.execute("UPDATE race_results SET team_id = ? WHERE team_id = ?", (tid, fid))
            # 更新冲刺赛表 (如果存在)
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sprint_results'")
            if cursor.fetchone():
                cursor.execute("UPDATE sprint_results SET team_id = ? WHERE team_id = ?", (tid, fid))
            
            # 更新车手统计关联
            cursor.execute("UPDATE driver_season_stats SET team_id = ? WHERE team_id = ?", (tid, fid))
            
            print(f"     [Merge] ID {fid} -> {tid} ({reason})")

    conn.commit()
    conn.close()
    print("  [OK] 特殊事件永久修正应用完成。")

if __name__ == "__main__":
    apply_special_events()
