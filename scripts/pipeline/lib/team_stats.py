from .constructor_rules import (
    apply_multi_entity_override,
    calculate_pre_1979_constructor_points,
)


def has_table(cursor, table_name):
    cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        (table_name,),
    )
    return cursor.fetchone() is not None


def has_column(cursor, table_name, column_name):
    cursor.execute(f"PRAGMA table_info({table_name})")
    return any(row[1] == column_name for row in cursor.fetchall())


def fetch_team_ids_for_season(cursor, season):
    cursor.execute(
        '''
        SELECT DISTINCT team_id
        FROM race_results rr
        JOIN races r ON rr.race_id = r.race_id
        WHERE r.season = ? AND rr.team_id IS NOT NULL
        ''',
        (season,),
    )
    return [row[0] for row in cursor.fetchall()]


def fetch_team_base_stats(cursor, season, team_id):
    cursor.execute(
        '''
        SELECT
            (
                SELECT COUNT(*)
                FROM (
                    SELECT DISTINCT rr.race_id
                    FROM race_results rr
                    JOIN races r1 ON rr.race_id = r1.race_id
                    WHERE r1.season = ? AND rr.team_id = ? AND rr.position = 1
                )
            ) as wins,
            (
                SELECT COUNT(*)
                FROM (
                    SELECT DISTINCT rr.race_id, rr.position
                    FROM race_results rr
                    JOIN races r2 ON rr.race_id = r2.race_id
                    WHERE r2.season = ? AND rr.team_id = ? AND rr.position <= 3
                )
            ) as podiums,
            (
                SELECT COUNT(*)
                FROM (
                    SELECT DISTINCT q.race_id
                    FROM qualifying q
                    JOIN races r3 ON q.race_id = r3.race_id
                    LEFT JOIN race_results rrq ON rrq.race_id = q.race_id AND rrq.driver_id = q.driver_id
                    WHERE r3.season = ?
                      AND q.position = 1
                      AND COALESCE(
                            rrq.team_id,
                            (
                                SELECT rr2.team_id
                                FROM race_results rr2
                                JOIN races r5 ON rr2.race_id = r5.race_id
                                WHERE r5.season = r3.season
                                  AND rr2.driver_id = q.driver_id
                                  AND rr2.team_id IS NOT NULL
                                GROUP BY rr2.team_id
                                ORDER BY SUM(rr2.points) DESC, COUNT(*) DESC, rr2.team_id
                                LIMIT 1
                            )
                          ) = ?
                )
            ) as poles,
            (
                SELECT COUNT(DISTINCT rr.race_id)
                FROM race_results rr
                JOIN races r4 ON rr.race_id = r4.race_id
                WHERE r4.season = ? AND rr.team_id = ?
            ) as races
        ''',
        (season, team_id, season, team_id, season, team_id, season, team_id),
    )
    return cursor.fetchone()


def calculate_team_points(
    cursor,
    season,
    team_id,
    *,
    has_sprint,
    has_fastest_lap,
    round_penalty_map,
    constructor_dsq_map,
    multi_entity_map,
):
    if season < 1958:
        # team_season_stats.points keeps the historical constructor-points validation scope
        # (1958+ for constructors), while wins/podiums/poles still need full-history coverage.
        return 0

    if season <= 1978:
        total_points = calculate_pre_1979_constructor_points(
            cursor,
            season,
            team_id,
            has_fastest_lap=has_fastest_lap,
        )
        return apply_multi_entity_override(total_points, season, team_id, multi_entity_map)

    cursor.execute(
        '''
        SELECT ra_inner.round_number, SUM(rr_inner.points)
        FROM race_results rr_inner
        JOIN races ra_inner ON rr_inner.race_id = ra_inner.race_id
        WHERE ra_inner.season = ? AND rr_inner.team_id = ?
        GROUP BY ra_inner.round_number
        ''',
        (season, team_id),
    )
    total_points = 0
    for round_number, round_points in cursor.fetchall():
        if (season, round_number, team_id) in round_penalty_map:
            penalty = round_penalty_map[(season, round_number, team_id)]
            if penalty == "ALL":
                round_points = 0
            elif isinstance(penalty, (int, float)):
                round_points = max(0, round_points - penalty)

        if (season, team_id) in constructor_dsq_map:
            disqualification = constructor_dsq_map[(season, team_id)]
            if disqualification.get("affected_rounds") and round_number in disqualification["affected_rounds"]:
                round_points = disqualification.get("final_points_for_rounds", 0)

        total_points += round_points

    if has_sprint and season >= 2021:
        if has_column(cursor, "sprint_races", "race_id"):
            cursor.execute(
                '''
                SELECT SUM(sprint_points)
                FROM (
                    SELECT spr.points AS sprint_points
                    FROM sprint_results spr
                    JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
                    WHERE sr.season = ? AND spr.team_id = ?

                    UNION ALL

                    SELECT spr.points AS sprint_points
                    FROM sprint_results spr
                    JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
                    JOIN races r ON sr.race_id = r.race_id
                    JOIN race_results rr ON r.race_id = rr.race_id AND spr.driver_id = rr.driver_id
                    WHERE sr.season = ? AND spr.team_id IS NULL AND rr.team_id = ?
                )
                ''',
                (season, team_id, season, team_id),
            )
        else:
            cursor.execute(
                '''
                SELECT SUM(spr.points)
                FROM sprint_results spr
                JOIN sprint_races sr ON spr.sprint_race_id = sr.sprint_race_id
                JOIN races r ON sr.season = r.season AND sr.round_number = r.round_number
                JOIN race_results rr ON r.race_id = rr.race_id AND spr.driver_id = rr.driver_id
                WHERE sr.season = ? AND rr.team_id = ?
                ''',
                (season, team_id),
            )
        total_points += cursor.fetchone()[0] or 0

    if (season, team_id) in constructor_dsq_map:
        disqualification = constructor_dsq_map[(season, team_id)]
        if not disqualification.get("affected_rounds"):
            total_points = disqualification.get("final_points", 0)

    return apply_multi_entity_override(total_points, season, team_id, multi_entity_map)
