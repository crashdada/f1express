def calculate_pre_1979_constructor_points(cursor, season, team_id, *, has_fastest_lap):
    fl_join = ""
    fl_deduction = "0"
    if season <= 1959 and has_fastest_lap:
        fl_join = (
            "LEFT JOIN fastest_lap_historical fl "
            "ON fl.race_id = r_inner.race_id AND fl.driver_id = r_inner.driver_id"
        )
        fl_deduction = "COALESCE(fl.fl_points, 0)"

    wcc_points_logic = "r_inner.points"
    if season == 1961:
        wcc_points_logic = "CASE WHEN r_inner.position = 1 THEN 8 ELSE r_inner.points END"

    cursor.execute(
        f'''
        SELECT ra_inner.round_number, MAX({wcc_points_logic} - {fl_deduction})
        FROM race_results r_inner
        JOIN races ra_inner ON r_inner.race_id = ra_inner.race_id
        {fl_join}
        WHERE ra_inner.season = ? AND r_inner.team_id = ?
        GROUP BY ra_inner.round_number
        ''',
        (season, team_id),
    )
    return sum(row[1] for row in cursor.fetchall())


def apply_multi_entity_override(total_points, season, team_id, multi_entity_map):
    return multi_entity_map.get((season, team_id), total_points)
