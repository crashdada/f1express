#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
导入冲刺赛数据到数据库
新建 sprint_races 和 sprint_results 表
"""
import pandas as pd
import sqlite3
import os
import re
import sys
from pathlib import Path

# Add parent directory to sys.path to import f1_config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import get_path, ensure_dirs

def normalize_name(name_str):
    """从人员列表中提取车手名"""
    # 匹配 "名字 (车队)" 或 "名字"
    match = re.match(r'(.+?)(?:\s*\((.+?)\))?$', str(name_str).strip())
    if match:
        return match.group(1).strip()
    return name_str.strip()

def create_sprint_tables(conn):
    """创建冲刺赛相关表"""
    cursor = conn.cursor()
    
    # 删除旧表（如果存在）
    cursor.execute("DROP TABLE IF EXISTS sprint_results")
    cursor.execute("DROP TABLE IF EXISTS sprint_races")
    
    # 创建 sprint_races 表
    cursor.execute('''
        CREATE TABLE sprint_races (
            sprint_race_id INTEGER PRIMARY KEY AUTOINCREMENT,
            season INTEGER NOT NULL,
            round_number INTEGER,
            circuit_id INTEGER,
            race_date TEXT,
            track_name_cn TEXT,
            FOREIGN KEY (circuit_id) REFERENCES circuits(circuit_id)
        )
    ''')
    
    # 创建 sprint_results 表
    cursor.execute('''
        CREATE TABLE sprint_results (
            result_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sprint_race_id INTEGER NOT NULL,
            driver_id INTEGER NOT NULL,
            team_id INTEGER,
            position INTEGER,
            points REAL,
            driver_name_cn TEXT,
            FOREIGN KEY (sprint_race_id) REFERENCES sprint_races(sprint_race_id),
            FOREIGN KEY (driver_id) REFERENCES drivers(driver_id),
            FOREIGN KEY (team_id) REFERENCES teams(team_id)
        )
    ''')
    
    conn.commit()
    print("[OK] 创建 sprint_races 和 sprint_results 表")

def get_track_mapping():
    """赛道中文名到英文名的映射"""
    return {
        '英国 (银石)': 'Silverstone',
        '意大利 (蒙扎)': 'Monza',
        '意大利 (伊莫拉)': 'Enzo',
        '巴西 (圣保罗)': 'Carlos Pace',
        '比利时 (斯帕)': 'Spa',
        '奥地利 (红牛环)': 'Spielberg',
        '美国 (奥斯汀)': 'Austin',
        '美国 (迈阿密)': 'Miami',
        '阿塞拜疆 (巴库)': 'Baku',
        '卡塔尔 (卢赛尔)': 'Lusail',
        '中国 (上海)': 'Shanghai',
        '美国 (迈阿密)': 'Miami',
    }

def get_driver_mapping():
    """车手中文名到英文名的映射"""
    return {
        '维斯塔潘': ('Max', 'Verstappen'),
        '汉密尔顿': ('Lewis', 'Hamilton'),
        '博塔斯': ('Valtteri', 'Bottas'),
        '里卡多': ('Daniel', 'Ricciardo'),
        '赛恩斯': ('Carlos', 'Sainz'),
        '勒克莱尔': ('Charles', 'Leclerc'),
        '佩雷兹': ('Sergio', 'Perez'),
        '诺里斯': ('Lando', 'Norris'),
        '马格努森': ('Kevin', 'Magnussen'),
        '拉塞尔': ('George', 'Russell'),
        '奥康': ('Esteban', 'Ocon'),
        '阿隆索': ('Fernando', 'Alonso'),
        '斯特罗尔': ('Lance', 'Stroll'),
        '斯托尔': ('Lance', 'Stroll'),        # 别名
        '胡肯伯格': ('Nico', 'Hulkenberg'),
        '皮亚斯特里': ('Oscar', 'Piastri'),
        '阿尔本': ('Alexander', 'Albon'),
        '加斯利': ('Pierre', 'Gasly'),
        '周冠宇': ('Guanyu', 'Zhou'),
        '角田': ('Yuki', 'Tsunoda'),
        '角田裕毅': ('Yuki', 'Tsunoda'),
        '德弗里斯': ('Nyck', 'De Vries'),
        '劳森': ('Liam', 'Lawson'),
        '科拉平托': ('Franco', 'Colapinto'),
        '杜汉': ('Jack', 'Doohan'),
        '安东内利': ('Kimi', 'Antonelli'),    # 去重：原来有两条重复
        '哈贾尔': ('Isack', 'Hadjar'),
        '贝尔曼': ('Oliver', 'Bearman'),
        '博托莱托': ('Gabriel', 'Bortoleto'),
        # 英文姓名兼容映射（防止 CSV 中出现英文名）
        'Hadjar':    ('Isack', 'Hadjar'),
        'Antonelli': ('Kimi', 'Antonelli'),
        'Bearman':   ('Oliver', 'Bearman'),
        'Bortoleto': ('Gabriel', 'Bortoleto'),
        'Doohan':    ('Jack', 'Doohan'),
        'Lawson':    ('Liam', 'Lawson'),
    }

def import_sprint_data(conn):
    """导入冲刺赛数据"""
    cursor = conn.cursor()
    
    # 读取数据
    csv_path = get_path('csv') / "sprint_results.csv"
    df_sprint = pd.read_csv(csv_path)
    
    track_mapping = get_track_mapping()
    driver_mapping = get_driver_mapping()
    
    # 统计
    total_records = len(df_sprint)
    success_count = 0
    failed_records = []
    
    # 按年份和赛道分组处理
    grouped = df_sprint.groupby(['年份', '赛道'])
    
    for (season, track_cn), group in grouped:
        # 查找赛道
        track_en = track_mapping.get(track_cn)
        if not track_en:
            failed_records.append(f"未找到赛道映射: {track_cn}")
            continue
        
        cursor.execute("""
            SELECT circuit_id FROM circuits 
            WHERE name LIKE ?
        """, (f'%{track_en}%',))
        circuit_result = cursor.fetchone()
        
        if not circuit_result:
            failed_records.append(f"未在数据库中找到赛道: {track_cn} -> {track_en}")
            continue
        
        circuit_id = circuit_result[0]
        
        # 查找该赛季该赛道对应的正赛轮次
        # 注意：同一赛道在不同年份可能有不同的 circuit_id，因此不能直接用 circuit_id 匹配
        # 改为用赛道英文名称模糊匹配该赛季赛历，确保返回正确轮次
        cursor.execute("""
            SELECT r.round_number FROM races r
            JOIN circuits c ON r.circuit_id = c.circuit_id
            WHERE r.season = ? AND c.name LIKE ?
            LIMIT 1
        """, (int(season), f'%{track_en}%'))
        rn_row = cursor.fetchone()
        round_number = rn_row[0] if rn_row else None

        if not round_number:
            print(f"警告: {season} 赛季赛历中找不到 '{track_en}' 对应的 round_number，将存为 NULL")

        # 创建 sprint_race 记录
        cursor.execute('''
            INSERT INTO sprint_races (season, round_number, circuit_id, track_name_cn)
            VALUES (?, ?, ?, ?)
        ''', (int(season), round_number, circuit_id, track_cn))
        
        sprint_race_id = cursor.lastrowid
        
        # 处理该场比赛的结果
        for _, row in group.iterrows():
            name_raw = normalize_name(row['人员列表'])
            
            # 1. 尝试从映射表获取
            driver_tuple = driver_mapping.get(name_raw)
            
            first_name, last_name = (None, None)
            driver_result = None
            
            if driver_tuple:
                first_name, last_name = driver_tuple
                # 精确查找
                cursor.execute("""
                    SELECT driver_id FROM drivers 
                    WHERE first_name = ? AND last_name = ?
                """, (first_name, last_name))
                driver_result = cursor.fetchone()
            
            # 2. 如果映射表没找到，或者精确查找失败，尝试直接当做 Last Name 模糊查找
            if not driver_result:
                # 使用映射后的 last_name (如果存在) 或者原始名字
                search_name = last_name if last_name else name_raw
                
                cursor.execute("""
                    SELECT driver_id FROM drivers 
                    WHERE last_name = ? OR last_name_cn = ?
                """, (search_name, search_name))
                driver_result = cursor.fetchone()
            
            if not driver_result:
                failed_records.append(f"未在数据库中找到车手: {name_raw} (Mapping: {driver_tuple})")
                continue
            
            driver_id = driver_result[0]
            position = int(row['真实排名'])
            points = float(row['得分'])
            
            # 插入结果
            cursor.execute('''
                INSERT INTO sprint_results 
                (sprint_race_id, driver_id, position, points, driver_name_cn)
                VALUES (?, ?, ?, ?, ?)
            ''', (sprint_race_id, driver_id, position, points, name_raw))
            
            success_count += 1

    
    conn.commit()
    
    print(f"\n导入统计:")
    print(f"  总记录: {total_records}")
    print(f"  成功: {success_count}")
    print(f"  失败: {len(failed_records)}")
    
    if failed_records:
        print(f"\n失败的记录:")
        for fail in failed_records[:20]:  # 只显示前20个
            print(f"  - {fail}")
        if len(failed_records) > 20:
            print(f"  ... 还有 {len(failed_records) - 20} 个")
    
    return success_count, failed_records

def verify_import(conn):
    """验证导入结果"""
    cursor = conn.cursor()
    
    print("\n" + "="*60)
    print("验证导入结果")
    print("="*60)
    
    # 1. 统计冲刺赛比赛场数
    cursor.execute("SELECT COUNT(*) FROM sprint_races")
    race_count = cursor.fetchone()[0]
    print(f"\n1. 冲刺赛比赛场数: {race_count}")
    
    # 2. 统计冲刺赛结果记录
    cursor.execute("SELECT COUNT(*) FROM sprint_results")
    result_count = cursor.fetchone()[0]
    print(f"2. 冲刺赛结果记录: {result_count}")
    
    # 3. 按年份统计
    cursor.execute("""
        SELECT season, COUNT(*) as count 
        FROM sprint_races 
        GROUP BY season 
        ORDER BY season
    """)
    print(f"\n3. 各年份冲刺赛场次:")
    for row in cursor.fetchall():
        print(f"   {row[0]}: {row[1]} 场")
    
    # 4. 验证车手积分计算
    cursor.execute("""
        SELECT d.first_name, d.last_name, SUM(sr.points) as sprint_points
        FROM sprint_results sr
        JOIN drivers d ON sr.driver_id = d.driver_id
        GROUP BY sr.driver_id
        ORDER BY sprint_points DESC
        LIMIT 10
    """)
    print(f"\n4. 冲刺赛积分前10名:")
    for row in cursor.fetchall():
        print(f"   {row[0]} {row[1]}: {row[2]} 分")
    
    # 5. 检查是否有重复或遗漏
    cursor.execute("""
        SELECT season, track_name_cn, COUNT(*) as cnt
        FROM sprint_races
        GROUP BY season, track_name_cn
        HAVING cnt > 1
    """)
    duplicates = cursor.fetchall()
    if duplicates:
        print(f"\n5. 发现重复记录:")
        for d in duplicates:
            print(f"   {d[0]} {d[1]}: {d[2]} 次")
    else:
        print(f"\n5. 无重复记录 [OK]")

def calculate_total_points_with_sprint(conn):
    """计算包含冲刺赛的总积分"""
    cursor = conn.cursor()
    
    print("\n" + "="*60)
    print("车手总积分对比 (正赛 vs 正赛+冲刺赛)")
    print("="*60)
    
    # 获取所有车手
    cursor.execute("""
        SELECT DISTINCT d.driver_id, d.first_name, d.last_name, d.code
        FROM drivers d
        JOIN race_results rr ON d.driver_id = rr.driver_id
        WHERE EXISTS (
            SELECT 1 FROM sprint_results sr WHERE sr.driver_id = d.driver_id
        )
        ORDER BY d.last_name
    """)
    
    drivers = cursor.fetchall()
    
    print(f"\n{'车手':<25} {'正赛积分':<12} {'冲刺赛':<10} {'总计':<12}")
    print("-" * 60)
    
    for driver_id, first_name, last_name, code in drivers:
        # 正赛积分
        cursor.execute("""
            SELECT SUM(points) FROM race_results WHERE driver_id = ?
        """, (driver_id,))
        race_points = cursor.fetchone()[0] or 0
        
        # 冲刺赛积分
        cursor.execute("""
            SELECT SUM(points) FROM sprint_results WHERE driver_id = ?
        """, (driver_id,))
        sprint_points = cursor.fetchone()[0] or 0
        
        total = race_points + sprint_points
        
        print(f"{first_name} {last_name:<15} {race_points:<12.1f} {sprint_points:<10.1f} {total:<12.1f}")

if __name__ == "__main__":
    ensure_dirs()
    db_path = str(get_path('db'))

    print("=" * 60)
    print("冲刺赛数据导入工具")
    print("=" * 60)

    conn = sqlite3.connect(db_path)

    try:
        create_sprint_tables(conn)
        success, failed = import_sprint_data(conn)
        verify_import(conn)
        # calculate_total_points_with_sprint(conn)  # 调试用，按需取消注释
        print("\n" + "=" * 60)
        print("导入完成!")
        print("=" * 60)
    except Exception as e:
        print(f"\n错误: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()
