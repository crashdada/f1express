#!/usr/bin/env python3
"""
Apply durable historical corrections from special_events.json.

This stage only mutates raw fact tables for corrections that cannot be
represented cleanly in the source CSV files.
"""
import os
import sqlite3
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import ensure_dirs, get_path
from lib.special_events import build_team_merge_rules, load_special_events


def apply_special_events():
    ensure_dirs()
    db_path = str(get_path('db'))

    if not os.path.exists(db_path):
        print(f"  [Error] Database not found: {db_path}")
        return

    events = load_special_events(Path(__file__).resolve().parent)
    if not events:
        print("  [SKIP] special_events.json not found")
        return

    print("  Applying durable database corrections from special_events.json...")

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    additions = events.get('points_additions', [])
    if additions:
        print(f"  -> Applying {len(additions)} point-addition rules...")
        for addition in additions:
            driver_name = addition.get('driver', '')
            first_name, _, last_name = driver_name.partition(' ')
            cursor.execute(
                '''
                UPDATE race_results
                SET points = COALESCE(points, 0) + ?
                WHERE race_id = (SELECT race_id FROM races WHERE season = ? AND round_number = ?)
                  AND driver_id = (SELECT driver_id FROM drivers WHERE first_name = ? AND last_name = ?)
                ''',
                (
                    addition.get('added_points'),
                    addition.get('year'),
                    addition.get('round'),
                    first_name,
                    last_name,
                ),
            )

    merges = events.get('team_id_merges', [])
    if merges:
        print(f"  -> Applying {len(merges)} team-id merge rules...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sprint_results'")
        has_sprint = cursor.fetchone() is not None
        resolved_merges = build_team_merge_rules(events, cursor, get_path('csv'))

        for merge in resolved_merges:
            from_id = merge['from_id']
            to_id = merge['to_id']
            reason = merge['reason']
            start_year = merge.get('start_year')
            end_year = merge.get('end_year')

            if not from_id or not to_id:
                print(f"     [Skip] Could not resolve merge target for {reason}")
                continue
            if from_id == to_id:
                print(f"     [Skip] Merge already normalized for {reason}")
                continue

            year_clause = ""
            params = [to_id, from_id]
            if start_year is not None or end_year is not None:
                if start_year is None:
                    start_year = 0
                if end_year is None:
                    end_year = 9999
                year_clause = " AND race_id IN (SELECT race_id FROM races WHERE season BETWEEN ? AND ?)"
                params.extend([start_year, end_year])

            cursor.execute(f"UPDATE race_results SET team_id = ? WHERE team_id = ?{year_clause}", params)
            if has_sprint:
                sprint_params = [to_id, from_id]
                sprint_clause = ""
                if start_year is not None or end_year is not None:
                    sprint_clause = " AND sprint_race_id IN (SELECT sprint_race_id FROM sprint_races WHERE season BETWEEN ? AND ?)"
                    sprint_params.extend([start_year, end_year])
                cursor.execute(f"UPDATE sprint_results SET team_id = ? WHERE team_id = ?{sprint_clause}", sprint_params)
            print(f"     [Merge] ID {from_id} -> {to_id} ({reason})")

    conn.commit()
    conn.close()
    print("  [OK] Special-event corrections applied.")


if __name__ == "__main__":
    apply_special_events()
