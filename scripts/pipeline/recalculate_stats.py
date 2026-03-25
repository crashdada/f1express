import os
import sqlite3
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import ensure_dirs, get_path
from lib.special_events import (
    build_constructor_dsq_map,
    build_multi_entity_map,
    build_round_penalty_map,
    load_special_events,
)
from lib.team_stats import (
    calculate_team_points,
    fetch_team_base_stats,
    fetch_team_ids_for_season,
    has_table,
)


def recalculate_stats():
    ensure_dirs()
    db_path = str(get_path('db'))
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("=" * 60)
    print("Recalculating season statistics from normalized race data...")
    print("=" * 60)

    cursor.execute("DELETE FROM driver_season_stats")
    cursor.execute("DELETE FROM team_season_stats")

    cursor.execute("SELECT season FROM seasons ORDER BY season")
    seasons = [row[0] for row in cursor.fetchall()]

    special_events = load_special_events(Path(__file__).resolve().parent)
    team_id_map = {team_name: team_id for team_id, team_name in cursor.execute("SELECT team_id, name FROM teams")}
    constructor_dsq_map = build_constructor_dsq_map(special_events, team_id_map)
    round_penalty_map = build_round_penalty_map(special_events, team_id_map)
    multi_entity_map = build_multi_entity_map(special_events, team_id_map)

    has_sprint = has_table(cursor, 'sprint_results')
    has_fastest_lap = has_table(cursor, 'fastest_lap_historical')

    for season in seasons:
        print(f"  Calculating season {season}...")

        if has_sprint and season >= 2021:
            cursor.execute(
                '''
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
                ''',
                (season, season, season),
            )
        else:
            cursor.execute(
                '''
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
                ''',
                (season, season),
            )

        driver_stats = cursor.fetchall()
        driver_stats.sort(key=lambda row: row[6], reverse=True)
        for position, stat in enumerate(driver_stats, 1):
            driver_id, team_id, races, wins, podiums, poles, points = stat
            cursor.execute(
                '''
                INSERT INTO driver_season_stats
                (driver_id, season, team_id, races, wins, podiums, poles, points, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (driver_id, season, team_id, races, wins, podiums, poles, points, position),
            )

        team_results = []
        for team_id in fetch_team_ids_for_season(cursor, season):
            wins, podiums, poles, races = fetch_team_base_stats(cursor, season, team_id)
            total_points = calculate_team_points(
                cursor,
                season,
                team_id,
                has_sprint=has_sprint,
                has_fastest_lap=has_fastest_lap,
                round_penalty_map=round_penalty_map,
                constructor_dsq_map=constructor_dsq_map,
                multi_entity_map=multi_entity_map,
            )
            team_results.append((team_id, races, wins, podiums, poles, total_points))

        team_results.sort(key=lambda row: row[5], reverse=True)
        for position, stat in enumerate(team_results, 1):
            team_id, races, wins, podiums, poles, points = stat
            cursor.execute(
                '''
                INSERT INTO team_season_stats
                (team_id, season, races, wins, podiums, poles, points, position)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''',
                (team_id, season, races, wins, podiums, poles, points, position),
            )

    conn.commit()
    conn.close()
    print("\n[OK] Season statistics recalculated successfully.")


if __name__ == '__main__':
    recalculate_stats()
