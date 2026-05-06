import json
import os
import sqlite3
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent.parent / "scripts"))
from f1_config import get_path
from pipeline.lib.identity_loader import (
    build_team_family_aliases,
    normalize_identity_text,
    resolve_team_name_from_registry,
)

DB_PATH = str(get_path('db'))

TEAM_STATS_KEYS = {
    "ferrari-family": "ferrari",
    "red-bull-family": "red_bull",
    "mercedes-family": "mercedes",
    "mclaren-family": "mclaren",
    "aston-martin-family": "aston_martin",
    "audi-family": "audi",
    "williams-family": "williams",
    "alpine-family": "alpine",
    "haas-family": "haas",
    "rb-family": "rb",
    "cadillac-family": "cadillac",
}


def get_team_stats_mapping():
    family_aliases = build_team_family_aliases()
    mapping = {}
    for family_id, product_key in TEAM_STATS_KEYS.items():
        aliases = family_aliases.get(family_id, [])
        if aliases:
            mapping[product_key] = aliases
    return mapping


def resolve_live_team_key(raw_name):
    canonical_name = resolve_team_name_from_registry(raw_name) or str(raw_name or "")
    normalized_canonical = normalize_identity_text(canonical_name)
    family_aliases = build_team_family_aliases()

    for family_id, product_key in TEAM_STATS_KEYS.items():
        aliases = family_aliases.get(family_id, [])
        if any(normalize_identity_text(alias) == normalized_canonical for alias in aliases):
            return product_key

    return normalized_canonical.replace("-", "_")


def get_stats():
    live_results_path = os.path.join(os.path.dirname(DB_PATH), "results_2026.json")
    live_points = {}

    if os.path.exists(live_results_path):
        try:
            with open(live_results_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for race in data:
                    for res in race.get("results", []):
                        team_id = resolve_live_team_key(res.get("team", ""))
                        live_points[team_id] = live_points.get(team_id, 0) + res.get("points", 0)

                    for res in race.get("sprintResults", []):
                        team_id = resolve_live_team_key(res.get("team", ""))
                        live_points[team_id] = live_points.get(team_id, 0) + res.get("points", 0)
        except Exception as e:
            print(f"Warning: Failed to parse 2026 live results for stats ({e})")

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    mapping = get_team_stats_mapping()
    results = {}

    for team_id, names in mapping.items():
        if not names:
            results[team_id] = {
                "history": {"championships": 0, "wins": 0, "podiums": 0, "poles": 0, "entries": 0, "firstEntry": "2026"},
                "stats": {"points": live_points.get(team_id, 0), "rank": 0, "wins": 0, "podiums": 0},
            }
            continue

        placeholders = ", ".join(["?" for _ in names])
        cur.execute(f"SELECT team_id FROM teams WHERE name IN ({placeholders})", names)
        team_ids = [row[0] for row in cur.fetchall()]

        if not team_ids:
            results[team_id] = {
                "history": {"championships": 0, "wins": 0, "podiums": 0, "poles": 0, "entries": 0, "firstEntry": "2026"},
                "stats": {"points": live_points.get(team_id, 0), "rank": 0, "wins": 0, "podiums": 0},
            }
            continue

        id_placeholders = ", ".join(["?" for _ in team_ids])

        cur.execute(
            f"SELECT COUNT(*) FROM team_championships WHERE team_id IN ({id_placeholders}) AND rank = 1",
            team_ids,
        )
        championships = cur.fetchone()[0] or 0

        cur.execute(
            f"SELECT SUM(wins), SUM(podiums), SUM(poles), SUM(races), SUM(points) FROM team_season_stats WHERE team_id IN ({id_placeholders})",
            team_ids,
        )
        row = cur.fetchone()
        wins, podiums, poles, entries, hist_points = row if row and row[0] is not None else (0, 0, 0, 0, 0)

        cur.execute(f"SELECT MIN(season) FROM team_season_stats WHERE team_id IN ({id_placeholders})", team_ids)
        first_year = cur.fetchone()[0] or 2026

        total_pts = float(hist_points or 0) + float(live_points.get(team_id, 0))

        results[team_id] = {
            "history": {
                "championships": int(championships),
                "wins": int(wins),
                "podiums": int(podiums),
                "poles": int(poles),
                "entries": int(entries),
                "firstEntry": str(first_year),
            },
            "stats": {"points": round(total_pts, 1), "rank": 0, "wins": int(wins), "podiums": int(podiums)},
        }

    conn.close()
    return results


if __name__ == "__main__":
    print(json.dumps(get_stats(), indent=4, ensure_ascii=False))
