#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新赛季统计表，添加冲刺赛积分
"""
import sqlite3
import os

def update_season_stats_with_sprint():
    """更新车手和车队的赛季统计，包含冲刺赛积分"""
    
    db_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'f1.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("="*70)
    print("更新赛季统计表 - 添加冲刺赛积分")
    print("="*70)
    
    # 检查是否存在冲刺赛表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sprint_results'")
    if not cursor.fetchone():
        print("\n错误: sprint_results 表不存在，请先运行 import_sprint_data.py")
        return
    
    print("\n1. 更新车手赛季统计...")
    
    # 获取2021年及以后的所有赛季
    cursor.execute('SELECT DISTINCT season FROM driver_season_stats WHERE season >= 2021 ORDER BY season')
    seasons = [row[0] for row in cursor.fetchall()]
    
    updated_drivers = 0
    for season in seasons:
        # 获取该赛季有车手记录的driver_id列表
        cursor.execute('''
            SELECT DISTINCT driver_id 
            FROM driver_season_stats 
            WHERE season = ?
        ''', (season,))
        drivers = cursor.fetchall()
        
        for (driver_id,) in drivers:
            # 获取冲刺赛积分
            cursor.execute('''
                SELECT COALESCE(SUM(spr.points), 0)
                FROM sprint_results spr
                JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
                WHERE spr.driver_id = ? AND sr.season = ?
            ''', (driver_id, season))
            sprint_points = cursor.fetchone()[0] or 0
            
            if sprint_points > 0:
                # 更新赛季统计，添加冲刺赛积分
                cursor.execute('''
                    UPDATE driver_season_stats
                    SET points = points + ?
                    WHERE driver_id = ? AND season = ?
                ''', (sprint_points, driver_id, season))
                updated_drivers += 1
    
    conn.commit()
    print(f"   更新了 {updated_drivers} 个车手赛季记录")
    
    print("\n2. 更新车队赛季统计...")
    
    # 获取2021年及以后的所有赛季
    cursor.execute('SELECT DISTINCT season FROM team_season_stats WHERE season >= 2021 ORDER BY season')
    seasons = [row[0] for row in cursor.fetchall()]
    
    updated_teams = 0
    for season in seasons:
        # 获取该赛季有车队记录的team_id列表
        cursor.execute('''
            SELECT DISTINCT team_id 
            FROM team_season_stats 
            WHERE season = ?
        ''', (season,))
        teams = cursor.fetchall()
        
        for (team_id,) in teams:
            # 获取该车手在冲刺赛中获得的积分（需要关联到车队）
            # 通过race_results获取车手在赛季中的车队信息
            cursor.execute('''
                SELECT DISTINCT rr.driver_id
                FROM race_results rr
                JOIN races r ON rr.race_id = r.race_id
                WHERE r.season = ? AND rr.team_id = ?
            ''', (season, team_id))
            drivers_in_team = cursor.fetchall()
            
            total_sprint_points = 0
            for (driver_id,) in drivers_in_team:
                cursor.execute('''
                    SELECT COALESCE(SUM(spr.points), 0)
                    FROM sprint_results spr
                    JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
                    WHERE spr.driver_id = ? AND sr.season = ?
                ''', (driver_id, season))
                driver_sprint = cursor.fetchone()[0] or 0
                total_sprint_points += driver_sprint
            
            if total_sprint_points > 0:
                # 更新车队赛季统计
                cursor.execute('''
                    UPDATE team_season_stats
                    SET points = points + ?
                    WHERE team_id = ? AND season = ?
                ''', (total_sprint_points, team_id, season))
                updated_teams += 1
    
    conn.commit()
    print(f"   更新了 {updated_teams} 个车队赛季记录")
    
    print("\n3. 重新计算排名...")
    
    # 重新计算车手排名
    for season in seasons:
        cursor.execute('''
            SELECT driver_id, points
            FROM driver_season_stats
            WHERE season = ?
            ORDER BY points DESC
        ''', (season,))
        
        for position, (driver_id, _) in enumerate(cursor.fetchall(), 1):
            cursor.execute('''
                UPDATE driver_season_stats
                SET position = ?
                WHERE driver_id = ? AND season = ?
            ''', (position, driver_id, season))
    
    # 重新计算车队排名
    for season in seasons:
        cursor.execute('''
            SELECT team_id, points
            FROM team_season_stats
            WHERE season = ?
            ORDER BY points DESC
        ''', (season,))
        
        for position, (team_id, _) in enumerate(cursor.fetchall(), 1):
            cursor.execute('''
                UPDATE team_season_stats
                SET position = ?
                WHERE team_id = ? AND season = ?
            ''', (position, team_id, season))
    
    conn.commit()
    print("   排名更新完成")
    
    print("\n4. 验证更新结果...")
    
    # 验证汉密尔顿
    cursor.execute('''
        SELECT season, points FROM driver_season_stats
        WHERE driver_id = 28 AND season >= 2021
        ORDER BY season
    ''')
    
    print("\n   汉密尔顿赛季积分 (更新后):")
    for row in cursor.fetchall():
        season, points = row
        # 计算验证
        cursor.execute('''
            SELECT 
                (SELECT COALESCE(SUM(rr.points), 0) 
                 FROM race_results rr 
                 JOIN races r ON rr.race_id = r.race_id 
                 WHERE rr.driver_id = 28 AND r.season = ?) +
                (SELECT COALESCE(SUM(spr.points), 0) 
                 FROM sprint_results spr 
                 JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id 
                 WHERE spr.driver_id = 28 AND sr.season = ?) as expected
        ''', (season, season))
        expected = cursor.fetchone()[0] or 0
        
        status = "OK" if abs(points - expected) < 0.1 else "ERR"
        print(f"      {season}: {points:.1f} {status}")
    
    conn.close()
    
    print("\n" + "="*70)
    print("更新完成!")
    print("="*70)

if __name__ == "__main__":
    update_season_stats_with_sprint()
