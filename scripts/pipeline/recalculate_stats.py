import sqlite3
import os
import json

def recalculate_stats():
    db_path = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'data', 'f1.db')
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("="*60)
    print("正在重新计算全赛季统计数据 (Idempotent Recalculation)...")
    print("="*60)

    # 1. 清空旧的统计表
    cursor.execute("DELETE FROM driver_season_stats")
    cursor.execute("DELETE FROM team_season_stats")
    
    # 获取所有赛季
    cursor.execute('SELECT season FROM seasons ORDER BY season')
    seasons = [row[0] for row in cursor.fetchall()]

    # 1.5 加载特殊事件配置
    special_events_path = os.path.join(os.path.dirname(__file__), 'special_events.json')
    special_events = {}
    if os.path.exists(special_events_path):
        with open(special_events_path, 'r', encoding='utf-8') as f:
            special_events = json.load(f)
    
    # --- 阶段 2: 初始化索引与映射 ---
    
    # 建立车队禁赛/取消资格查找索引
    constructor_dsq_map = {}
    # 动态查询车队 ID（不再硬编码，防止数据库重建后 ID 漂移）
    team_id_map = {}
    cursor.execute("SELECT team_id, name FROM teams")
    for row in cursor.fetchall():
        team_id_map[row[1]] = row[0]
    
    for entry in special_events.get("constructor_disqualifications", []):
        t_en = entry.get("team_en")
        t_cn = entry.get("team")
        t_id = None
        # 尝试中文和英文匹配
        if t_cn in team_id_map:
            t_id = team_id_map[t_cn]
        elif t_en in team_id_map:
            t_id = team_id_map[t_en]
            
        if t_id:
            constructor_dsq_map[(entry["year"], t_id)] = entry

    # 建立单站积分扣除查找索引
    round_penalty_map = {}
    for entry in special_events.get("points_penalties", []):
        t_en = entry.get("team_en")
        t_cn = entry.get("team")
        t_id = None
        if t_cn in team_id_map:
            t_id = team_id_map[t_cn]
        elif t_en in team_id_map:
            t_id = team_id_map[t_en]
            
        if t_id:
            round_penalty_map[(entry["year"], entry["round"], t_id)] = entry["points_deducted"]

    # 建立多实体积分覆盖索引 (莲花等多引擎车队)
    multi_entity_map = {}  # {(year, team_id): total_points}
    for entry in special_events.get("constructor_multi_entity", []):
        t_en = entry.get("team_en")
        t_cn = entry.get("team")
        t_id = None
        if t_cn in team_id_map:
            t_id = team_id_map[t_cn]
        elif t_en in team_id_map:
            t_id = team_id_map[t_en]
            
        if t_id:
            for yr_str, data in entry.get("overrides", {}).items():
                multi_entity_map[(int(yr_str), t_id)] = data["total"]
    
    # 检查是否存在冲刺赛表
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sprint_results'")
    has_sprint = cursor.fetchone() is not None

    for season in seasons:
        print(f"  计算 {season} 赛季...")
        
        # --- 驾照统计 (Driver Stats) ---
        if has_sprint and season >= 2021:
            query = '''
                SELECT 
                    t1.driver_id,
                    (SELECT team_id FROM race_results rr2 JOIN races r2 ON rr2.race_id = r2.race_id 
                     WHERE rr2.driver_id = t1.driver_id AND r2.season = ? 
                     GROUP BY team_id ORDER BY SUM(points) DESC LIMIT 1) as main_team_id,
                    COUNT(*) as races,
                    SUM(CASE WHEN t1.position = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN t1.position <= 3 THEN 1 ELSE 0 END) as podiums,
                    SUM(CASE WHEN q.position = 1 THEN 1 ELSE 0 END) as poles,
                    SUM(t1.points) + COALESCE(sprint.sprint_points, 0) as total_points
                FROM race_results t1
                LEFT JOIN qualifying q ON t1.race_id = q.race_id AND t1.driver_id = q.driver_id
                JOIN races ra ON t1.race_id = ra.race_id
                LEFT JOIN (
                    SELECT spr.driver_id, SUM(spr.points) as sprint_points
                    FROM sprint_results spr
                    JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
                    WHERE sr.season = ?
                    GROUP BY spr.driver_id
                ) sprint ON t1.driver_id = sprint.driver_id
                WHERE ra.season = ?
                GROUP BY t1.driver_id
            '''
            cursor.execute(query, (season, season, season))
        else:
            query = '''
                SELECT 
                    t1.driver_id,
                    (SELECT team_id FROM race_results rr2 JOIN races r2 ON rr2.race_id = r2.race_id 
                     WHERE rr2.driver_id = t1.driver_id AND r2.season = ? 
                     GROUP BY team_id ORDER BY SUM(points) DESC LIMIT 1) as main_team_id,
                    COUNT(*) as races,
                    SUM(CASE WHEN t1.position = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN t1.position <= 3 THEN 1 ELSE 0 END) as podiums,
                    SUM(CASE WHEN q.position = 1 THEN 1 ELSE 0 END) as poles,
                    SUM(t1.points) as total_points
                FROM race_results t1
                LEFT JOIN qualifying q ON t1.race_id = q.race_id AND t1.driver_id = q.driver_id
                JOIN races ra ON t1.race_id = ra.race_id
                WHERE ra.season = ?
                GROUP BY t1.driver_id
            '''
            cursor.execute(query, (season, season))
            
        driver_stats = cursor.fetchall()
        driver_stats.sort(key=lambda x: x[6], reverse=True)
        for position, stat in enumerate(driver_stats, 1):
            d_id, t_id, races, wins, pods, poles, pts = stat
            cursor.execute('''
                INSERT INTO driver_season_stats 
                (driver_id, season, team_id, races, wins, podiums, poles, points, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (d_id, season, t_id, races, wins, pods, poles, pts, position))

        # --- 车队统计 (Team Stats) ---
        if season < 1958:
            print(f"    (跳过 {season} 车队统计，WCC 尚未开始)")
            continue

        # 获取当前赛季的所有车队
        cursor.execute('''
            SELECT DISTINCT team_id FROM race_results rr
            JOIN races r ON rr.race_id = r.race_id
            WHERE r.season = ? AND rr.team_id IS NOT NULL
        ''', (season,))
        teams_in_season = [r[0] for r in cursor.fetchall()]

        team_season_results = []
        for t_id in teams_in_season:
            # 基础数据：胜场、领奖台、杆位
            cursor.execute('''
                SELECT 
                    SUM(CASE WHEN r.position = 1 THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN r.position <= 3 THEN 1 ELSE 0 END) as podiums,
                    SUM(CASE WHEN q.position = 1 THEN 1 ELSE 0 END) as poles,
                    COUNT(DISTINCT r.race_id) as races
                FROM race_results r
                LEFT JOIN qualifying q ON r.race_id = q.race_id AND r.driver_id = q.driver_id
                JOIN races ra ON r.race_id = ra.race_id
                WHERE ra.season = ? AND r.team_id = ?
            ''', (season, t_id))
            wins, pods, poles, races = cursor.fetchone()

            # 核心逻辑：按站计算积分
            if season <= 1978:
                # 1950-1978: 每站取最高分 (扣除FSJ)
                fl_join = ""
                fl_deduction = "0"
                if season <= 1959:
                    fl_join = "LEFT JOIN fastest_lap_historical fl ON fl.race_id = r_inner.race_id AND fl.driver_id = r_inner.driver_id"
                    fl_deduction = "COALESCE(fl.fl_points, 0)"
                
                wcc_pts_logic = "r_inner.points"
                if season == 1961:
                    wcc_pts_logic = "CASE WHEN r_inner.position = 1 THEN 8 ELSE r_inner.points END"

                cursor.execute(f'''
                    SELECT ra_inner.round_number, MAX({wcc_pts_logic} - {fl_deduction})
                    FROM race_results r_inner
                    JOIN races ra_inner ON r_inner.race_id = ra_inner.race_id
                    {fl_join}
                    WHERE ra_inner.season = ? AND r_inner.team_id = ?
                    GROUP BY ra_inner.round_number
                ''', (season, t_id))
                round_points = [r[1] for r in cursor.fetchall()]
                total_pts = sum(round_points)
            else:
                # 1979+: 所有车手积分相加
                cursor.execute('''
                    SELECT ra_inner.round_number, SUM(rr_inner.points)
                    FROM race_results rr_inner
                    JOIN races ra_inner ON rr_inner.race_id = ra_inner.race_id
                    WHERE ra_inner.season = ? AND rr_inner.team_id = ?
                    GROUP BY ra_inner.round_number
                ''', (season, t_id))
                rounds = cursor.fetchall()
                total_pts = 0
                for r_num, r_pts in rounds:
                    # 应用单站处罚 (1995 巴西, 2000 奥地利)
                    if (season, r_num, t_id) in round_penalty_map:
                        penalty = round_penalty_map[(season, r_num, t_id)]
                        if penalty == "ALL":
                            r_pts = 0
                        elif isinstance(penalty, (int, float)):
                            r_pts = max(0, r_pts - penalty)
                    
                    # 应用分段 DSQ (2018 印度力量)
                    if (season, t_id) in constructor_dsq_map:
                        dsq = constructor_dsq_map[(season, t_id)]
                        if dsq.get("affected_rounds") and r_num in dsq["affected_rounds"]:
                            r_pts = dsq.get("final_points_for_rounds", 0)

                    total_pts += r_pts
                
                # 加上冲刺赛 (2021+)
                if has_sprint and season >= 2021:
                    cursor.execute('''
                        SELECT SUM(spr.points)
                        FROM sprint_results spr
                        JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
                        -- 获取该车手在该场比赛所属的车队
                        JOIN races r ON sr.season = r.season AND sr.round_number = r.round_number
                        JOIN race_results rr ON r.race_id = rr.race_id AND spr.driver_id = rr.driver_id
                        WHERE sr.season = ? AND rr.team_id = ?
                    ''', (season, t_id))
                    s_pts = cursor.fetchone()[0] or 0
                    total_pts += s_pts

            # 全程处罚 (2007 迈凯伦)
            if (season, t_id) in constructor_dsq_map:
                dsq = constructor_dsq_map[(season, t_id)]
                if not dsq.get("affected_rounds"):
                    total_pts = dsq.get("final_points", 0)

            # 多实体覆盖 (莲花等多引擎车队)
            if (season, t_id) in multi_entity_map:
                total_pts = multi_entity_map[(season, t_id)]

            team_season_results.append((t_id, races, wins, pods, poles, total_pts))

        # 排序并插入
        team_season_results.sort(key=lambda x: x[5], reverse=True)
        for position, stat in enumerate(team_season_results, 1):
            t_id, races, wins, pods, poles, pts = stat
            cursor.execute('''
                INSERT INTO team_season_stats 
                (team_id, season, races, wins, podiums, poles, points, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (t_id, season, races, wins, pods, poles, pts, position))

    # 注意：冠军数据由 Step 9 (recalculate_championships.cjs) 权威计算
    # 此处不再覆盖 seasons 表的 champion_driver_id / champion_team_id
    # 避免与 Step 9 使用的历史 bestResults 截取规则产生不一致

    conn.commit()
    conn.close()
    print("\n[OK] 统计数据重算完成！")

if __name__ == '__main__':
    recalculate_stats()
