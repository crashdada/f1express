import json
from pathlib import Path

from .team_mapping import load_team_name_map, resolve_team_name


def load_special_events(pipeline_dir=None):
    base_dir = Path(pipeline_dir) if pipeline_dir else Path(__file__).resolve().parent.parent
    json_path = base_dir / 'special_events.json'
    if not json_path.exists():
        return {}

    with json_path.open('r', encoding='utf-8-sig') as handle:
        return json.load(handle)


def resolve_team_id(entry, team_id_map, team_name_map=None, existing_team_names=None):
    team_cn = entry.get('team')
    team_en = entry.get('team_en')
    if team_cn in team_id_map:
        return team_id_map[team_cn]
    if team_en in team_id_map:
        return team_id_map[team_en]

    if team_name_map and existing_team_names:
        if team_cn:
            resolved = resolve_team_name(team_cn, team_name_map, existing_team_names)
            if resolved in team_id_map:
                return team_id_map[resolved]
        if team_en:
            resolved = resolve_team_name(team_en, team_name_map, existing_team_names)
            if resolved in team_id_map:
                return team_id_map[resolved]
    return None


def build_constructor_dsq_map(events, team_id_map):
    constructor_dsq_map = {}
    existing_team_names = team_id_map.keys()
    for entry in events.get('constructor_disqualifications', []):
        team_id = resolve_team_id(entry, team_id_map, {}, existing_team_names)
        if team_id is not None:
            constructor_dsq_map[(entry['year'], team_id)] = entry
    return constructor_dsq_map


def build_round_penalty_map(events, team_id_map):
    round_penalty_map = {}
    existing_team_names = team_id_map.keys()
    for entry in events.get('points_penalties', []):
        team_id = resolve_team_id(entry, team_id_map, {}, existing_team_names)
        if team_id is not None:
            round_penalty_map[(entry['year'], entry['round'], team_id)] = entry['points_deducted']
    return round_penalty_map


def build_multi_entity_map(events, team_id_map):
    multi_entity_map = {}
    existing_team_names = team_id_map.keys()
    for entry in events.get('constructor_multi_entity', []):
        team_id = resolve_team_id(entry, team_id_map, {}, existing_team_names)
        if team_id is None:
            continue

        for year, data in entry.get('overrides', {}).items():
            multi_entity_map[(int(year), team_id)] = data['total']

    return multi_entity_map


def build_team_merge_rules(events, cursor, csv_dir):
    team_name_map = load_team_name_map(csv_dir)
    cursor.execute("SELECT team_id, name FROM teams")
    rows = cursor.fetchall()
    team_id_map = {name: team_id for team_id, name in rows}
    existing_team_names = team_id_map.keys()

    resolved_rules = []
    for merge in events.get('team_id_merges', []):
        from_id = None
        to_id = None

        if any(merge.get(key) for key in ('from_team', 'from_team_en')):
            from_entry = {'team': merge.get('from_team'), 'team_en': merge.get('from_team_en')}
            from_id = resolve_team_id(from_entry, team_id_map, team_name_map, existing_team_names)
        else:
            from_id = merge.get('from')

        if any(merge.get(key) for key in ('to_team', 'to_team_en')):
            to_entry = {'team': merge.get('to_team'), 'team_en': merge.get('to_team_en')}
            to_id = resolve_team_id(to_entry, team_id_map, team_name_map, existing_team_names)
        else:
            to_id = merge.get('to')

        resolved_rules.append(
            {
                'from_id': from_id,
                'to_id': to_id,
                'reason': merge.get('reason', 'Merged history'),
                'start_year': merge.get('start_year'),
                'end_year': merge.get('end_year'),
            }
        )

    return resolved_rules
