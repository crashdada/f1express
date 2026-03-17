#!/usr/bin/env python3
"""
将 scraper_results.py 采集的 JSON 追加到 race_results.csv
复用现有管线 (create_normalized_db.py) 重建数据库

CSV格式: 名次,NO,名,姓,缩写,车队,圈数,完成时间,得分,年份,场次,序号
"""
import json
import os
import csv

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
default_website_dir = os.path.dirname(CURRENT_DIR)
WEBSITE_DIR = os.environ.get('F1_WEBSITE_DIR', default_website_dir)
CSV_PATH = os.path.join(WEBSITE_DIR, 'csv', 'race_results.csv')
OUTLINE_PATH = os.path.join(WEBSITE_DIR, 'csv', 'race_outline.csv')
DRIVERS_JSON = os.path.join(CURRENT_DIR, 'data', 'drivers_2026.json')
SCHEDULE_JSON = os.path.join(CURRENT_DIR, 'data', 'schedule_2026.json')

# 2026 车队在官网/采集 JSON 中的名称 -> CSV 中应使用的名称
TEAM_CSV_MAP = {
    'Mercedes': 'Mercedes',
    'Ferrari': 'Ferrari',
    'Red Bull': 'Red Bull Racing',
    'McLaren': 'McLaren',
    'Aston Martin': 'Aston Martin',
    'Alpine': 'Alpine',
    'Williams': 'Williams',
    'Haas': 'Haas F1 Team',
    'Racing Bulls': 'Racing Bulls',
    'Audi': 'Audi',
    'Cadillac': 'Cadillac',
}

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def get_event_id_from_url(url):
    """从 F1 官网 URL 提取 event_id (raceId)"""
    # URL: .../results/2026/races/1279/australia/race-result
    import re
    m = re.search(r'/races/(\d+)/', url)
    return int(m.group(1)) if m else None

def append_results_to_csv(result_file):
    """将采集的 JSON 结果追加到 race_results.csv"""

    results_data = load_json(result_file)
    drivers_2026 = load_json(DRIVERS_JSON)

    slug = results_data['slug']
    url = results_data.get('url', '')
    event_id = get_event_id_from_url(url)
    if not event_id:
        print(f"[!] 无法从 URL 获取 event_id: {url}")
        return False

    # 建立 车号 -> 车手信息 映射
    no_map = {}
    for d in drivers_2026:
        num = str(d.get('number', ''))
        no_map[num] = d

    # 加载日程以便解析赛道信息（用于 race_outline.csv）
    schedule = load_json(SCHEDULE_JSON)
    schedule_event = None
    for event in schedule:
        if event.get('slug') == slug:
            schedule_event = event
            break

    # 检查 CSV 中是否已有这场比赛的数据（防止重复追加）
    existing_rows = 0
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # skip header
        for row in reader:
            if len(row) >= 11 and row[9] == '2026' and row[10] == str(event_id):
                existing_rows += 1

    if existing_rows > 0:
        print(f"[!] CSV 中已存在 2026 event_id={event_id} 的 {existing_rows} 条记录，跳过")
        return False

    # 获取当前 CSV 最大序号
    max_seq = 0
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) >= 12:
                try:
                    seq = int(row[11])
                    max_seq = max(max_seq, seq)
                except ValueError:
                    pass

    # 构造新行并追加
    new_rows = []
    for i, r in enumerate(results_data['results'], 1):
        no = str(r['no'])
        driver = no_map.get(no, {})
        first = driver.get('firstName', '')
        last = driver.get('lastName', '')
        code = driver.get('code', '')
        team = driver.get('team', '')
        csv_team = TEAM_CSV_MAP.get(team, team)
        pos = r['pos']
        pts = r['points']
        # 提取新增的圈数和完成时间
        laps = r.get('laps', '')
        time_str = r.get('time', '')

        seq = max_seq + i
        new_rows.append([pos, no, first, last, code, csv_team, laps, time_str, pts, 2026, event_id, seq])

    # 追加到 CSV (race_results)
    with open(CSV_PATH, 'a', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        for row in new_rows:
            writer.writerow(row)

    print(f"✅ 已追加 {len(new_rows)} 条记录到 {CSV_PATH}")
    print(f"   年份=2026, 场次(event_id)={event_id}, 序号={max_seq+1}~{max_seq+len(new_rows)}")

    # 检查并追加到 race_outline.csv
    outline_existing = False
    with open(OUTLINE_PATH, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        for row in reader:
            if len(row) > 1 and row[0] == '2026' and row[1] == str(event_id):
                outline_existing = True
                break

    if not outline_existing and schedule_event:
        circuit_name = schedule_event.get('gpName', schedule_event.get('location', slug))
        country_name = schedule_event.get('country', slug).title()
        
        # 解析起止日期
        start_date = ''
        end_date = ''
        sessions = schedule_event.get('sessions', [])
        if sessions:
            try:
                # 把 format: "2026-03-08T05:00:00Z" 变成 "2026/3/8"
                def parse_iso(iso_str):
                    dt = iso_str.split('T')[0].split('-')
                    return f"{int(dt[0])}/{int(dt[1])}/{int(dt[2])}"
                start_date = parse_iso(sessions[0]['time'])
                end_date = parse_iso(sessions[-1]['time'])
            except:
                pass
        
        pole = results_data.get('polePosition', {})
        pole_no = str(pole.get('no', ''))
        pole_driver = no_map.get(pole_no, {})
        
        outline_row = [
            2026,
            event_id,
            circuit_name,
            pole.get('time', ''),
            pole_driver.get('firstName', ''),
            pole_driver.get('lastName', ''),
            pole_driver.get('code', ''),
            country_name,
            start_date,
            end_date
        ]
        
        with open(OUTLINE_PATH, 'a', encoding='utf-8', newline='') as f:
            csv.writer(f).writerow(outline_row)
        print(f"✅ 赛历数据已追加到 {OUTLINE_PATH} (杆位: {pole_driver.get('lastName', '')})")

    return True


if __name__ == '__main__':
    results_dir = os.path.join(CURRENT_DIR, 'results_2026')
    if not os.path.exists(results_dir):
        print(f"[!] 结果目录不存在: {results_dir}")
        exit(1)

    print("=" * 60)
    print("F1 Results -> CSV Appender")
    print("=" * 60)

    any_success = False
    for fname in os.listdir(results_dir):
        if fname.endswith('_results.json'):
            result_file = os.path.join(results_dir, fname)
            print(f"Processing {fname}...")
            if append_results_to_csv(result_file):
                any_success = True

    if any_success:
        print("\n可以继续运行 pipeline 重建数据库 (sync_f1_data.py)")

