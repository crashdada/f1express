#!/usr/bin/env python3
"""
从采集的分站结果 JSON 生成统一的 results_2026.json
输出到 f1-collector/data/ 目录，由 syncer.py 同步至展示端

输出格式:
[
  {
    "round": 1,
    "country": "Australia",
    "slug": "australia",
    "date": "2026-03-16",
    "results": [
      { "pos": 1, "firstName": "George", "lastName": "Russell", "code": "RUS",
        "team": "Mercedes", "teamCn": "梅赛德斯", "points": 25, "status": "Finished" },
      ...
    ]
  },
  ...
]
"""
import json
import os
import re
from datetime import datetime

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_DIR = os.path.join(CURRENT_DIR, 'results_2026')
DATA_DIR = os.path.join(CURRENT_DIR, 'data')
DRIVERS_JSON = os.path.join(DATA_DIR, 'drivers_2026.json')
SCHEDULE_JSON = os.path.join(DATA_DIR, 'schedule_2026.json')
OUTPUT_JSON = os.path.join(DATA_DIR, 'results_2026.json')

# 中文车队名映射
TEAM_CN_MAP = {
    'Mercedes': '梅赛德斯',
    'Ferrari': '法拉利',
    'Red Bull Racing': '红牛', 'Red Bull': '红牛',
    'McLaren': '迈凯伦',
    'Aston Martin': '阿斯顿马丁',
    'Alpine': 'Alpine',
    'Williams': '威廉姆斯',
    'Haas F1 Team': '哈斯', 'Haas': '哈斯',
    'Racing Bulls': 'Racing Bulls',
    'Audi': 'Audi',
    'Cadillac': 'Cadillac',
}


def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_results_json():
    """从 results_2026/ 下所有分站结果 JSON 生成统一的 results_2026.json"""
    if not os.path.exists(RESULTS_DIR):
        print(f"[!] 结果目录不存在: {RESULTS_DIR}")
        return

    # 加载车手信息 (车号 -> 车手)
    drivers = load_json(DRIVERS_JSON)
    no_map = {}
    for d in drivers:
        no_map[str(d.get('number', ''))] = d

    # 加载赛程信息 (slug -> date)
    schedule = load_json(SCHEDULE_JSON)
    slug_date_map = {}
    slug_round_map = {}
    for event in schedule:
        s = event.get('slug', '')
        # 从 sessions 中取 RACE 的日期
        for sess in event.get('sessions', []):
            if sess.get('name', '').upper() == 'RACE':
                slug_date_map[s] = sess['time'][:10]  # "2026-03-16T..."
                break
        # round number
        rn = event.get('roundNumber')
        if rn:
            slug_round_map[s] = rn

    # 遍历所有分站结果文件
    all_races = []
    result_files = sorted([f for f in os.listdir(RESULTS_DIR) if f.endswith('.json')])

    for fname in result_files:
        fpath = os.path.join(RESULTS_DIR, fname)
        raw = load_json(fpath)

        slug = raw.get('slug', fname.replace('_results.json', ''))
        country = raw.get('country', slug).title()
        round_str = raw.get('round', '')
        round_num = slug_round_map.get(slug)
        if not round_num:
            m = re.search(r'(\d+)', round_str)
            round_num = int(m.group(1)) if m else 0
        race_date = slug_date_map.get(slug, '')

        results = []
        for r in raw.get('results', []):
            no = str(r['no'])
            driver = no_map.get(no, {})

            pos_raw = r['pos']
            try:
                pos = int(pos_raw)
                status = 'Finished'
            except (ValueError, TypeError):
                pos = None
                status = 'DNF'

            results.append({
                'pos': pos,
                'firstName': driver.get('firstName', ''),
                'lastName': driver.get('lastName', ''),
                'firstNameCn': driver.get('firstNameCn', ''),
                'lastNameCn': driver.get('lastNameCn', ''),
                'code': driver.get('code', ''),
                'number': int(no) if no.isdigit() else 0,
                'team': driver.get('team', ''),
                'teamCn': TEAM_CN_MAP.get(driver.get('team', ''), driver.get('teamCn', '')),
                'points': r.get('points', 0),
                'status': status,
            })

        race_info = {
            'round': round_num,
            'country': country,
            'slug': slug,
            'date': race_date,
            'results': results,
        }

        pole = raw.get('polePosition')
        if pole:
            pole_no = str(pole.get('no', ''))
            pole_driver = no_map.get(pole_no, {})
            race_info['polePosition'] = {
                'time': pole.get('time', ''),
                'code': pole_driver.get('code', ''),
                'firstName': pole_driver.get('firstName', ''),
                'lastName': pole_driver.get('lastName', ''),
                'firstNameCn': pole_driver.get('firstNameCn', ''),
                'lastNameCn': pole_driver.get('lastNameCn', '')
            }

        all_races.append(race_info)

    # 按 round 排序
    all_races.sort(key=lambda x: x['round'] or 0)

    # 写入
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(all_races, f, indent=2, ensure_ascii=False)

    total_results = sum(len(r['results']) for r in all_races)
    print(f"✅ 已生成 {OUTPUT_JSON}")
    print(f"   共 {len(all_races)} 场比赛, {total_results} 条成绩")
    return all_races


if __name__ == '__main__':
    build_results_json()
