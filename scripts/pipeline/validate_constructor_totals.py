#!/usr/bin/env python3
"""
Validate constructor season totals in the database against constructors_full.csv.

This script is intentionally read-only:
- database totals remain the production source of truth
- constructors_full.csv is used only as a consistency check
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

    report_path = write_report(
        {
            'summary': {
                'csv_rows': len(csv_totals),
                'db_rows': len(db_totals),
                'csv_unmatched_rows': unmatched_rows,
                'missing_in_db': len(missing_in_db),
                'differences': len(diffs),
                'db_only_rows': len(extra_db_rows),
            },
            'missing_in_db': missing_in_db,
            'differences': diffs,
            'db_only_rows': extra_db_rows,
        }
    )

    print('=== Constructor Totals Validation ===')
    print(f'Compared CSV rows: {len(csv_totals)}')
    print(f'Database rows: {len(db_totals)}')
    print(f'CSV unmatched rows: {unmatched_rows}')
    print(f'Missing in DB: {len(missing_in_db)}')
    print(f'Differences found: {len(diffs)}')
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
