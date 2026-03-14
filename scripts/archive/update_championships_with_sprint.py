#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新冠军表，添加冲刺赛积分 (2021-2025)
"""
import sqlite3
import os

def update_championships_with_sprint():
    """更新车手和车队冠军表，包含冲刺赛积分"""
    
    db_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'f1.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("="*70)
    print("更新冠军表 - 添加冲刺赛积分")
    print("="*70)
    
    # 检查是否存在冲刺赛表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sprint_results'")
    if not cursor.fetchone():
        print("\n错误: sprint_results 表不存在")
        return
    
    print("\n1. 更新车手冠军表...")
    
    # 获取2021-2025年的车手冠军
    cursor.execute('''
        SELECT dc.driver_id, dc.season, dc.points
        FROM driver_championships dc
        WHERE dc.season >= 2021 AND dc.season <= 2025
    ''')
    
    updated = 0
    for driver_id, season, current_points in cursor.fetchall():
        # 获取冲刺赛积分
        cursor.execute('''
            SELECT COALESCE(SUM(spr.points), 0)
            FROM sprint_results spr
            JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
            WHERE spr.driver_id = ? AND sr.season = ?
        ''', (driver_id, season))
        
        sprint_points = cursor.fetchone()[0] or 0
        
        if sprint_points > 0:
            new_points = current_points + sprint_points
            cursor.execute('''
                UPDATE driver_championships
                SET points = ?
                WHERE driver_id = ? AND season = ?
            ''', (new_points, driver_id, season))
            updated += 1
            
            # 获取车手姓名用于显示
            cursor.execute('SELECT first_name, last_name FROM drivers WHERE driver_id = ?', (driver_id,))
            name = cursor.fetchone()
            print(f"   {season}: {name[0]} {name[1]} - {current_points} + {sprint_points} = {new_points}")
    
    conn.commit()
    print(f"   更新了 {updated} 个车手冠军记录")
    
    print("\n2. 更新车队冠军表...")
    
    # 获取2021-2025年的车队冠军
    cursor.execute('''
        SELECT tc.team_id, tc.season, tc.points
        FROM team_championships tc
        WHERE tc.season >= 2021 AND tc.season <= 2025
    ''')
    
    updated = 0
    for team_id, season, current_points in cursor.fetchall():
        # 获取该车队的所有车手在该赛季的冲刺赛积分
        cursor.execute('''
            SELECT COALESCE(SUM(spr.points), 0)
            FROM sprint_results spr
            JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
            JOIN race_results rr ON spr.driver_id = rr.driver_id
            JOIN races r ON rr.race_id = r.race_id
            WHERE rr.team_id = ? AND sr.season = ? AND r.season = ?
        ''', (team_id, season, season))
        
        sprint_points = cursor.fetchone()[0] or 0
        
        if sprint_points > 0:
            new_points = current_points + sprint_points
            cursor.execute('''
                UPDATE team_championships
                SET points = ?
                WHERE team_id = ? AND season = ?
            ''', (new_points, team_id, season))
            updated += 1
            
            # 获取车队名用于显示
            cursor.execute('SELECT name FROM teams WHERE team_id = ?', (team_id,))
            name = cursor.fetchone()
            print(f"   {season}: {name[0]} - {current_points} + {sprint_points} = {new_points}")
    
    conn.commit()
    print(f"   更新了 {updated} 个车队冠军记录")
    
    print("\n3. 验证更新结果...")
    
    # 车手冠军对比
    print("\n   车手冠军对比 (冠军表 vs 赛季统计表):")
    cursor.execute('''
        SELECT dc.season, d.first_name, d.last_name, dc.points, dss.points
        FROM driver_championships dc
        JOIN drivers d ON dc.driver_id = d.driver_id
        JOIN driver_season_stats dss ON dc.driver_id = dss.driver_id AND dc.season = dss.season
        WHERE dc.season >= 2021 AND dc.rank = 1
        ORDER BY dc.season
    ''')
    
    for row in cursor.fetchall():
        season, fn, ln, champ_pts, stats_pts = row
        status = "OK" if abs(champ_pts - stats_pts) < 0.1 else "DIFF"
        print(f"      {season}: {fn} {ln} - 冠军表:{champ_pts} 统计表:{stats_pts} [{status}]")
    
    conn.close()
    
    print("\n" + "="*70)
    print("更新完成!")
    print("="*70)

if __name__ == "__main__":
    update_championships_with_sprint()
