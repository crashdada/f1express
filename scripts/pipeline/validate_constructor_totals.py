#!/usr/bin/env python3
"""
校验 team_season_stats 与 constructors_full.csv 的车队赛季积分。

这份脚本只负责“校验”，不负责修库，规则务必固定如下：

1. 正式展示源
   - 生产库以 team_season_stats 为准。
   - 前端、collector 派生数据都基于正式库，不直接读 constructors_full.csv。

2. 验证表口径
   - constructors_full.csv 仅作为对账基准。
   - 读取 CSV 时必须优先使用 outof；仅当 outof 为空时，才回退到 points。
   - 这是历史 WCC 口径，不能简单只累加 points。

3. 差异解释
   - points 不同：这是“积分差异”，必须优先处理。
   - points 相同但 rank 不同：这是“排名差异”，单独看，不要和积分问题混淆。
   - DB-only rows：数据库存在、验证表不存在的赛季条目，属于覆盖范围差异，不代表已对上的积分错误。

4. 当前项目约定
   - 先清积分差异，再看排名差异。
   - Ferrari 1958-2025 的正确验证口径应为 10722.0。
"""
import csv
import json
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import get_path, ensure_dirs
from lib.team_mapping import load_team_name_map, resolve_team_name


def load_csv_totals(cursor):
    constructors_path = get_path('csv') / 'constructors_full.csv'
    if not constructors_path.exists():
        return {}, 0

    team_name_map = load_team_name_map(get_path('csv'))
    cursor.execute("SELECT team_id, name FROM teams")
    db_team_ids = {name: team_id for team_id, name in cursor.fetchall()}

    totals = defaultdict(lambda: {'points': 0.0, 'rank': None})
    unmatched_rows = 0

    with constructors_path.open('r', encoding='utf-8-sig', newline='') as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            season_raw = str(row.get('year', '')).strip()
            team_raw = str(row.get('team', '')).strip()
            if not season_raw or not team_raw:
                continue

            canonical_team = resolve_team_name(team_raw, team_name_map, db_team_ids.keys())
            team_id = db_team_ids.get(canonical_team)
            if not team_id:
                unmatched_rows += 1
                continue

            # constructors_full.csv 的验证口径：
            # 优先 outof（历史 WCC 官方口径），为空时再回退到 points。
            points_raw = str(row.get('outof', '')).strip() or str(row.get('points', '')).strip() or '0'
            rank_raw = str(row.get('rank', '')).strip()

            try:
                season = int(season_raw)
                points = float(points_raw)
                rank = int(rank_raw) if rank_raw else None
            except ValueError:
                continue

            bucket = totals[(season, team_id)]
            bucket['points'] += points
            if rank is not None:
                bucket['rank'] = min(bucket['rank'], rank) if bucket['rank'] is not None else rank

    return totals, unmatched_rows


def load_db_totals(cursor):
    cursor.execute(
        '''
        SELECT season, team_id, points, position
        FROM team_season_stats
        '''
    )
    return {
        (season, team_id): {'points': float(points or 0), 'rank': int(position) if position is not None else None}
        for season, team_id, points, position in cursor.fetchall()
    }


def write_report(payload):
    report_dir = Path(__file__).resolve().parent / 'artifacts'
    report_dir.mkdir(parents=True, exist_ok=True)
    report_path = report_dir / 'constructor_validation_report.json'
    with report_path.open('w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
    return report_path


def main():
    ensure_dirs()
    db_path = get_path('db')
    if not db_path.exists():
        print(f'[ERROR] Database not found: {db_path}')
        return 1

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    csv_totals, unmatched_rows = load_csv_totals(cursor)
    db_totals = load_db_totals(cursor)

    diffs = []
    missing_in_db = []
    extra_db_rows = []

    for key in sorted(csv_totals):
        csv_row = csv_totals.get(key)
        db_row = db_totals.get(key)
        if db_row is None:
            season, team_id = key
            team_name = cursor.execute('SELECT name FROM teams WHERE team_id = ?', (team_id,)).fetchone()
            missing_in_db.append({
                'season': season,
                'team_id': team_id,
                'team_name': team_name[0] if team_name else '<missing>',
                'csv_points': csv_row['points'],
                'csv_rank': csv_row['rank'],
            })
            continue

        csv_points = csv_row['points'] if csv_row else None
        db_points = db_row['points'] if db_row else None
        csv_rank = csv_row['rank'] if csv_row else None
        db_rank = db_row['rank'] if db_row else None

        points_match = csv_points is not None and db_points is not None and abs(csv_points - db_points) < 1e-9
        rank_match = csv_rank == db_rank or csv_rank is None or db_rank is None

        if not points_match or not rank_match:
            season, team_id = key
            team_name = cursor.execute('SELECT name FROM teams WHERE team_id = ?', (team_id,)).fetchone()
            diffs.append({
                'season': season,
                'team_id': team_id,
                'team_name': team_name[0] if team_name else '<missing>',
                'db_points': db_points,
                'csv_points': csv_points,
                'db_rank': db_rank,
                'csv_rank': csv_rank,
            })

    for key in sorted(set(db_totals) - set(csv_totals)):
        season, team_id = key
        team_name = cursor.execute('SELECT name FROM teams WHERE team_id = ?', (team_id,)).fetchone()
        db_row = db_totals[key]
        extra_db_rows.append({
            'season': season,
            'team_id': team_id,
            'team_name': team_name[0] if team_name else '<missing>',
            'db_points': db_row['points'],
            'db_rank': db_row['rank'],
        })

    point_diffs = [
        diff for diff in diffs
        if abs(float(diff['db_points'] or 0) - float(diff['csv_points'] or 0)) > 1e-9
    ]
    rank_only_diffs = [diff for diff in diffs if diff not in point_diffs]

    report_path = write_report(
        {
            'summary': {
                'csv_rows': len(csv_totals),
                'db_rows': len(db_totals),
                'csv_unmatched_rows': unmatched_rows,
                'missing_in_db': len(missing_in_db),
                'differences': len(diffs),
                'point_differences': len(point_diffs),
                'rank_only_differences': len(rank_only_diffs),
                'db_only_rows': len(extra_db_rows),
            },
            'missing_in_db': missing_in_db,
            'differences': diffs,
            'point_differences': point_diffs,
            'rank_only_differences': rank_only_diffs,
            'db_only_rows': extra_db_rows,
        }
    )

    print('=== Constructor Totals Validation ===')
    print(f'Compared CSV rows: {len(csv_totals)}')
    print(f'Database rows: {len(db_totals)}')
    print(f'CSV unmatched rows: {unmatched_rows}')
    print(f'Missing in DB: {len(missing_in_db)}')
    print(f'Differences found: {len(diffs)}')
    print(f'Point differences: {len(point_diffs)}')
    print(f'Rank-only differences: {len(rank_only_diffs)}')
    print(f'DB-only rows (reported separately): {len(extra_db_rows)}')
    print(f'Report written to: {report_path}')

    if missing_in_db or diffs:
        if missing_in_db:
            print('\nMissing DB rows:')
            for diff in missing_in_db[:15]:
                print(
                    f"  {diff['season']} | {diff['team_name']} (team_id={diff['team_id']}) | "
                    f"csv_points={diff['csv_points']} csv_rank={diff['csv_rank']}"
                )
        print('\nTop differences:')
        for diff in diffs[:25]:
            print(
                f"  {diff['season']} | {diff['team_name']} (team_id={diff['team_id']}) | "
                f"db_points={diff['db_points']} csv_points={diff['csv_points']} | "
                f"db_rank={diff['db_rank']} csv_rank={diff['csv_rank']}"
            )
        return 1

    print('No differences found.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
