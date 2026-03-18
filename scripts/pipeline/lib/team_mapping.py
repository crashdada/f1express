import csv


SEASON_TEAM_ALIASES = {
    'fittipaldi ford': [
        (1975, 1979, 'Copersucar'),
        (1980, None, 'Fittipaldi'),
    ],
}


def load_team_name_map(csv_dir):
    mapping_path = csv_dir / 'team_names.csv'
    mapping = {}
    if not mapping_path.exists():
        return mapping

    with mapping_path.open('r', encoding='utf-8-sig', newline='') as handle:
        reader = csv.reader(handle)
        rows = list(reader)

    for row in rows[1:]:
        if len(row) >= 2:
            raw_name = str(row[0]).strip()
            canonical_name = str(row[1]).strip()
            if raw_name and canonical_name:
                mapping[raw_name] = canonical_name

    return mapping


def resolve_season_team_alias(name, season=None):
    if season is None:
        return None

    alias_rules = SEASON_TEAM_ALIASES.get(str(name).strip().casefold())
    if not alias_rules:
        return None

    for start_year, end_year, canonical_name in alias_rules:
        if season >= start_year and (end_year is None or season <= end_year):
            return canonical_name

    return None


def resolve_team_name(raw_name, team_name_map, existing_team_names=None, season=None):
    if not raw_name or str(raw_name).lower() == 'nan':
        return 'Unknown'

    name = str(raw_name).strip()
    if not name:
        return 'Unknown'

    season_alias = resolve_season_team_alias(name, season=season)
    if season_alias:
        return season_alias

    canonical = team_name_map.get(name)
    if canonical:
        return canonical

    lowered = name.casefold()
    for source_name, mapped_name in team_name_map.items():
        if source_name.casefold() == lowered:
            return mapped_name

    if existing_team_names:
        for existing_name in existing_team_names:
            if str(existing_name).casefold() == lowered:
                return existing_name

    return name


def build_team_id_map(cursor):
    cursor.execute("SELECT team_id, name FROM teams")
    rows = cursor.fetchall()
    return {name: team_id for team_id, name in rows}
