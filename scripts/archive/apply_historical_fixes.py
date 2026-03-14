#!/usr/bin/env python3
"""
F1 历史数据修正汇总脚本 (Consolidated Historical Fixes)
包含：1956年 Fangio 积分修正、其他单场赛果修正等。
"""
import sqlite3
import os

def apply_historical_fixes():
    db_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'f1.db')
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("="*60)
    print("正在应用历史数据修正 (Historical Data Fixes)...")
    print("="*60)
    
    # 1. 修复 1956 年 Fangio 积分 (已弃用: 数据源 CSV 已包含正确修正)
    # ----------------------------------------------------
    # print("\n[Fix] 1956 Juan Manuel Fangio 积分修正...")
    # fangio_1956_updates = [
    #     (1, 5, "阿根廷GP - 胜利（换车）"),
    #     (2, 4, "摩纳哥GP - 第2名（共享车）"),
    #     (4, 4, "法国GP - 第4名"),
    #     (5, 8, "英国GP - 胜利"),
    #     (6, 9, "德国GP - 胜利+最快圈速"),
    #     (7, 3, "意大利GP - 第2名（换车）"),
    # ]
    
    # count_1956 = 0
    # for round_num, new_points, reason in fangio_1956_updates:
    #     cursor.execute('''
    #         UPDATE race_results
    #         SET points = ?
    #         WHERE driver_id = (SELECT driver_id FROM drivers WHERE first_name = 'Juan Manuel' AND last_name = 'Fangio')
    #         AND race_id IN (SELECT race_id FROM races WHERE season = 1956 AND round_number = ?)
    #     ''', (new_points, round_num))
    #     if cursor.rowcount > 0:
    #         count_1956 += 1
            
    # print(f"   - 已更新 {count_1956} 条 1956 年记录")

    # 2. 这里的其他修正可以根据需要继续添加
    # ----------------------------------------------------
    
    conn.commit()
    conn.close()
    print("\n" + "="*60)
    print("[OK] 历史数据修正应用完成！")
    print("="*60)

if __name__ == '__main__':
    apply_historical_fixes()
