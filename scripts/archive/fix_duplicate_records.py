#!/usr/bin/env python3
"""
修复Excel重复记录导入问题（适配新的round_number映射）
对于同一场比赛的同一车手，累加所有积分而不是覆盖
"""
import pandas as pd
import sqlite3
import os

def fix_duplicate_records():
    # 使用相对路径
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
    
    csv_path = os.path.join(PROJECT_ROOT, "csv", "race_results.csv")
    db_path = os.path.join(PROJECT_ROOT, "public", "data", "f1.db")
    
    print(f"读取 CSV 数据: {csv_path}")
    if not os.path.exists(csv_path):
        print(f"错误: 找不到文件 {csv_path}")
        return

    df = pd.read_csv(csv_path)
    
    print(f"总记录数: {len(df)}")
    
    # 按 (年份, 场次, 名, 姓) 分组，累加得分
    print("\n分析重复记录...")
    
    grouped = df.groupby(['年份', '场次', '名', '姓']).agg({
        '得分': 'sum',  # 累加得分
        '车队': 'first',  # 取第一个车队
        '名次': 'first',  # 取第一个名次
        '圈数': 'max',  # 取最大圈数
        '完成时间': 'first'  # 取第一个时间
    }).reset_index()
    
    print(f"去重后记录数: {len(grouped)}")
    print(f"减少了 {len(df) - len(grouped)} 条重复记录")
    
    # 连接数据库
    print("\n连接数据库...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 获取drivers映射
    drivers_dict = {}
    cursor.execute('SELECT driver_id, first_name, last_name FROM drivers')
    for row in cursor.fetchall():
        drivers_dict[(row[1], row[2])] = row[0]
    
    # 创建Excel全局场次到数据库round_number的映射
    print("\n创建场次映射...")
    
    # 获取所有比赛，按赛季和round_number排序
    cursor.execute('''
        SELECT race_id, season, round_number
        FROM races
        ORDER BY season, round_number
    ''')
    races_in_db = cursor.fetchall()
    
    # 从Excel获取唯一的比赛，按年份和场次排序
    unique_races_excel = df[['年份', '场次']].drop_duplicates().sort_values(['年份', '场次'])
    
    # 创建映射：(season, global_round) -> (race_id, db_round_number)
    race_mapping = {}
    excel_idx = 0
    
    for race_id, season, db_round in races_in_db:
        if excel_idx < len(unique_races_excel):
            excel_row = unique_races_excel.iloc[excel_idx]
            excel_season = int(excel_row['年份'])
            excel_global_round = int(excel_row['场次'])
            
            if excel_season == season:
                race_mapping[(season, excel_global_round)] = (race_id, db_round)
                excel_idx += 1
    
    print(f"创建了 {len(race_mapping)} 个场次映射")
    
    # 更新所有重复记录的积分
    print("\n更新重复记录的积分...")
    update_count = 0
    not_found = 0
    
    for idx, row in grouped.iterrows():
        season = int(row['年份'])
        global_round = int(row['场次'])
        first_name = str(row['名']).strip()
        last_name = str(row['姓']).strip()
        points = float(row['得分'])
        
        # 使用映射获取race_id
        race_info = race_mapping.get((season, global_round))
        driver_id = drivers_dict.get((first_name, last_name))
        
        if race_info and driver_id:
            race_id, db_round = race_info
            
            # 更新积分
            cursor.execute('''
                UPDATE race_results 
                SET points = ?
                WHERE race_id = ? AND driver_id = ?
            ''', (points, race_id, driver_id))
            
            if cursor.rowcount > 0:
                update_count += 1
        else:
            not_found += 1
    
    conn.commit()
    print(f"更新了 {update_count} 条记录")
    
    # 验证Fangio的积分
    fangio_id = drivers_dict.get(('Juan Manuel', 'Fangio'))
    if fangio_id:
        cursor.execute('''
            SELECT SUM(rr.points)
            FROM race_results rr
            JOIN races r ON rr.race_id = r.race_id
            WHERE rr.driver_id = ? AND r.season = 1956
        ''', (fangio_id,))
        total = cursor.fetchone()[0]
        print(f"\n验证: Fangio 1956年数据库总积分 = {total}")
    
    conn.close()
    print("\nDONE 完成！")

if __name__ == '__main__':
    fix_duplicate_records()
