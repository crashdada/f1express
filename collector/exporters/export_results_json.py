#!/usr/bin/env python3
"""
将 collector/results_2026/ 下的单站 JSON 汇总为统一的 results_2026.json。

保留：
- 正赛完整 laps / time
- 冲刺赛前 8
- 排位赛前 3（Q1/Q2/Q3）

替补车手（v1.4.1）：
- 三段查表：substitutes_2026.json → drivers_2026.json → storage/f1.db
- 每个 isSubstitute 行写出 actualCode + replaceReason
- 当 actualCode 命中已注册身份时，UI 直接显示真名 + amber 角标
"""

import json
import os
import re
import sqlite3


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
COLLECTOR_DIR = os.path.dirname(CURRENT_DIR)
WEBSITE_DIR = os.path.dirname(COLLECTOR_DIR)
RESULTS_DIR = os.path.join(COLLECTOR_DIR, "results_2026")
DATA_DIR = os.path.join(COLLECTOR_DIR, "data")
STORAGE_DB = os.path.join(WEBSITE_DIR, "storage", "f1.db")
DRIVERS_JSON = os.path.join(DATA_DIR, "drivers_2026.json")
SUBSTITUTES_JSON = os.path.join(DATA_DIR, "substitutes_2026.json")
SCHEDULE_JSON = os.path.join(DATA_DIR, "schedule_2026.json")
SUBSTITUTIONS_JSON = (
    os.path.join(WEBSITE_DIR, "scripts", "f1_substitutions_2026.json")
)
OUTPUT_JSON = os.path.join(DATA_DIR, "results_2026.json")


TEAM_CN_MAP = {
    "Mercedes": "梅赛德斯",
    "Red Bull": "红牛",
    "McLaren": "迈凯伦",
    "Ferrari": "法拉利",
    "Alpine": "Alpine",
    "Williams": "威廉姆斯",
    "Racing Bulls": "RB",
    "Haas": "哈斯",
    "Audi": "奥迪",
    "Aston Martin": "阿斯顿马丁",
    "Cadillac": "凯迪拉克",
}

# Scraped team column variants -> canonical roster team name.
# The results table is authoritative for which constructor a driver raced for
# (a substitute can drive for a different team than their season roster entry).
RAW_TEAM_CANONICAL = {
    "Red Bull Racing": "Red Bull",
    "Haas F1 Team": "Haas",
}

VALID_REPLACE_REASONS = {"illness", "injury", "penalty", "promotion", "reserve", "other"}


def load_json(path):
    if not path or not os.path.exists(path):
        return None
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def to_position(value):
    try:
        if value is None or value == "":
            return None
        text = str(value).strip().upper()
        if text in {"NC", "DNF", "DNS", "DSQ"}:
            return None
        return int(text)
    except (ValueError, TypeError):
        return None


def to_status(value):
    return "Finished" if to_position(value) is not None else "DNF"


def to_points(value):
    """Normalize a points cell to a JSON number.

    Spider/HTML scrapers emit points as strings (for example "25" or "0.5"),
    while the __NEXT_DATA__ scraper emits ints. Downstream consumers
    (calculate_team_stats, the frontend standings) require numbers, so we
    coerce here to keep the published results_2026.json type-stable.
    """
    if value is None or value == "":
        return 0
    text = str(value).strip()
    if text.upper() in {"", "-", "NC", "DNF", "DNS", "DSQ"}:
        return 0
    try:
        number = float(text)
    except (ValueError, TypeError):
        return 0
    return int(number) if number.is_integer() else number


def extract_event_id(url):
    match = re.search(r"/races/(\d+)/", url or "")
    return int(match.group(1)) if match else None


def build_history_driver_index(db_path):
    """Read storage/f1.db and return two indexes:
    - by_code: { code: { firstName, lastName, firstNameCn, lastNameCn, number, last_season } }
    - by_number: { number: same shape } — only the *most recent* driver per number.

    Used as a last-resort fallback for substitute drivers not in 2026 roster.
    """
    index_by_code = {}
    index_by_number = {}
    if not db_path or not os.path.exists(db_path):
        return index_by_code, index_by_number

    try:
        con = sqlite3.connect(db_path)
        cur = con.cursor()
        cur.execute(
            """
            SELECT d.driver_id, d.first_name, d.last_name, d.first_name_cn,
                   d.last_name_cn, d.code, d.number,
                   MAX(r.season) AS last_season
            FROM drivers d
            LEFT JOIN race_results rr ON rr.driver_id = d.driver_id
            LEFT JOIN races r ON rr.race_id = r.race_id
            WHERE d.code IS NOT NULL AND d.code != ''
            GROUP BY d.driver_id
            """
        )
        for row in cur.fetchall():
            driver_id, first, last, first_cn, last_cn, code, number, last_season = row
            record = {
                "firstName": first or "",
                "lastName": last or "",
                "firstNameCn": first_cn or "",
                "lastNameCn": last_cn or "",
                "code": code or "",
                "number": str(number) if number else "",
                "last_season": last_season,
            }
            # For each code, keep the record from the most recent season.
            existing = index_by_code.get(code)
            if existing is None or (record["last_season"] or 0) > (existing["last_season"] or 0):
                index_by_code[code] = record
            # For each number, keep the most recent.
            if number:
                num_key = str(number)
                existing_num = index_by_number.get(num_key)
                if existing_num is None or (record["last_season"] or 0) > (existing_num["last_season"] or 0):
                    index_by_number[num_key] = record
    except sqlite3.Error as error:
        print(f"[!] Failed to read history DB at {db_path}: {error}")
    finally:
        if "con" in locals():
            con.close()

    return index_by_code, index_by_number


def load_substitute_metadata():
    """Return: { slug: { carNumber(str): { actualCode, reason, note } } }"""
    data = load_json(SUBSTITUTIONS_JSON)
    if not isinstance(data, dict):
        return {}
    output = {}

    for slug, entries in data.items():
        per_car = {}
        for entry in entries or []:
            reason = entry.get("reason")
            if reason and reason not in VALID_REPLACE_REASONS:
                print(f"[!] {slug} car {entry.get('carNumber')}: invalid reason {reason!r}, dropping")
                reason = None
            per_car[str(entry.get("carNumber", ""))] = {
                "actualCode": entry.get("actualCode"),
                "reason": reason,
                "note": entry.get("note"),
                "team": entry.get("team"),
                "teamCn": entry.get("teamCn"),
            }
        output[slug] = per_car
    return output



def record_substitute_appearance(substitutes, round_number, car_number, actual_code):
    """Update substitutes_2026.json with appearedRounds for this match."""
    if not actual_code:
        return
    target = next(
        (entry for entry in substitutes if entry.get("code") == actual_code or str(entry.get("number")) == str(car_number)),
        None,
    )
    if not target:
        return
    rounds = set(target.get("appearedRounds") or [])
    rounds.add(round_number)
    target["appearedRounds"] = sorted(rounds)


def resolve_driver(
    no_str,
    sub_meta,
    no_map,
    substitutes_by_code,
    substitutes_by_number,
    history_by_code,
    history_by_number,
):
    """Resolve a race row's identity.

    Priority for substitute rows (sub_meta present):
      1. substitutes_2026 by actualCode
      2. drivers_2026 by actualCode
      3. history DB by actualCode
      4. history DB by number (last holder)
      5. drivers_2026 by number (2026 main roster)
    Priority for non-substitute rows:
      1. drivers_2026 by number
    """
    if sub_meta:
        actual_code = sub_meta.get("actualCode")
        if actual_code:
            candidate = substitutes_by_code.get(actual_code)
            if candidate is None:
                candidate = no_map.get(actual_code)
            if candidate is None:
                candidate = history_by_code.get(actual_code)
            if candidate is not None:
                return candidate, sub_meta, actual_code

        # Last-resort: look up by number in history (most recent holder)
        if no_str:
            candidate = history_by_number.get(no_str)
            if candidate is not None:
                return candidate, sub_meta, candidate.get("code") or None

        return {}, sub_meta, None

    return no_map.get(no_str, {}), None, None


def canonical_team_name(value):
    text = str(value or "").strip()
    if not text:
        return ""
    return RAW_TEAM_CANONICAL.get(text, text)


def compose_driver_fields(record, actual_code):
    if not record:
        return {}, None
    fields = {
        "firstName": record.get("firstName", ""),
        "lastName": record.get("lastName", ""),
        "firstNameCn": record.get("firstNameCn", ""),
        "lastNameCn": record.get("lastNameCn", ""),
        "code": record.get("code") or (actual_code or ""),
        "team": record.get("team", ""),
        "teamCn": record.get("teamCn") or TEAM_CN_MAP.get(record.get("team", ""), ""),
    }
    return fields, fields["code"]

def enrich_result(item, driver_record, sub_meta, resolved_code):
    """Compose the per-result dict, adding substitute inline fields when applicable."""
    pos = to_position(item.get("pos"))
    fields, code = compose_driver_fields(driver_record, resolved_code)

    # Team resolution precedence:
    #   1. the per-race team from the scraped results table (authoritative:
    #      a substitute can drive for a different constructor than their
    #      season roster entry, e.g. a Racing Bulls driver filling in at
    #      Red Bull)
    #   2. an explicit substitution config entry, for rows whose scrape
    #      omitted the team column
    #   3. the driver's season roster team
    raw_team = canonical_team_name(item.get("team"))
    roster_team = fields.get("team", "")
    roster_team_cn = fields.get("teamCn") or TEAM_CN_MAP.get(roster_team, "")
    if raw_team:
        team = raw_team
        # Reuse the roster translation when the raw team is the driver's own
        # constructor; otherwise (substitute driving elsewhere) translate fresh.
        if canonical_team_name(roster_team) == raw_team and roster_team_cn:
            team_cn = roster_team_cn
        else:
            team_cn = TEAM_CN_MAP.get(team, "")
    elif sub_meta and sub_meta.get("team"):
        team = canonical_team_name(sub_meta["team"])
        team_cn = sub_meta.get("teamCn") or TEAM_CN_MAP.get(team, "")
    else:
        team = roster_team
        team_cn = roster_team_cn

    fields["team"] = team
    fields["teamCn"] = team_cn

    base = {
        "pos": pos,
        "firstName": fields.get("firstName", ""),
        "lastName": fields.get("lastName", ""),
        "firstNameCn": fields.get("firstNameCn", ""),
        "lastNameCn": fields.get("lastNameCn", ""),
        "code": code or "",
        "number": int(str(item.get("no", "0"))) if str(item.get("no", "")).isdigit() else 0,
        "team": team,
        "teamCn": team_cn,
        "points": to_points(item.get("points")),
        "status": to_status(item.get("pos")),
        "laps": item.get("laps"),
        "time": item.get("time"),
    }
    if sub_meta:
        if sub_meta.get("actualCode"):
            base["actualCode"] = sub_meta["actualCode"]
        if sub_meta.get("reason"):
            base["replaceReason"] = sub_meta["reason"]
        base["isSubstitute"] = True
    return base


def build_results_json():
    if not os.path.exists(RESULTS_DIR):
        print(f"[!] 结果目录不存在: {RESULTS_DIR}")
        return

    drivers_2026 = load_json(DRIVERS_JSON) or []
    no_map = {str(item.get("number", "")): item for item in drivers_2026}
    code_map = {str(item.get("code", "")): item for item in drivers_2026 if item.get("code")}

    def lookup_driver(item):
        """Resolve a race row by code first, then by car number."""
        raw_code = str(item.get("code") or "").strip().upper()
        if raw_code:
            candidate = code_map.get(raw_code)
            if candidate is not None:
                return candidate
        return no_map.get(str(item.get("no", "")), {})

    substitutes = load_json(SUBSTITUTES_JSON) or []
    sub_by_code = {str(item.get("code", "")): item for item in substitutes if item.get("code")}
    sub_by_number = {str(item.get("number", "")): item for item in substitutes if item.get("number") is not None}

    history_by_code, history_by_number = build_history_driver_index(STORAGE_DB)

    schedule = load_json(SCHEDULE_JSON) or []
    slug_date_map = {}
    slug_round_map = {}
    for event in schedule:
        slug = event.get("slug", "")
        for session in event.get("sessions", []):
            if session.get("name", "").upper() == "RACE":
                slug_date_map[slug] = session["time"][:10]
                break
        if event.get("roundNumber"):
            slug_round_map[slug] = event["roundNumber"]

    substitution_lookup = load_substitute_metadata()

    all_races = []
    result_files = sorted(name for name in os.listdir(RESULTS_DIR) if name.endswith(".json"))

    for filename in result_files:
        raw = load_json(os.path.join(RESULTS_DIR, filename))
        if not raw:
            continue

        slug = raw.get("slug", filename.replace("_results.json", ""))
        country = raw.get("country", slug).title()
        round_str = raw.get("round", "")
        round_num = slug_round_map.get(slug)
        if not round_num:
            match = re.search(r"(\d+)", round_str)
            round_num = int(match.group(1)) if match else 0

        race_info = {
            "round": round_num,
            "eventId": raw.get("eventId") or extract_event_id(raw.get("url")),
            "country": country,
            "slug": slug,
            "date": slug_date_map.get(slug, ""),
            "results": [],
        }

        race_subs = substitution_lookup.get(slug, {})

        def lookup(item):
            no_str = str(item.get("no", ""))
            code_str = str(item.get("code", "")).upper()

            # Prefer explicit code on the row, then car number.
            sub_meta = None
            if code_str and code_str in race_subs:
                sub_meta = race_subs[code_str]
            elif no_str in race_subs:
                sub_meta = race_subs[no_str]

            if not sub_meta:
                if code_str:
                    candidate = code_map.get(code_str)
                    if candidate is not None:
                        return candidate, None, code_str
                return no_map.get(no_str, {}), None, None

            record, returned_meta, resolved_code = resolve_driver(
                no_str,
                sub_meta,
                code_map,
                sub_by_code,
                sub_by_number,
                history_by_code,
                history_by_number,
            )
            return record, returned_meta, resolved_code

        for item in raw.get("results", []):
            no = str(item.get("no", ""))
            record, sub_meta, resolved_code = lookup(item)
            if sub_meta and round_num:
                record_substitute_appearance(
                    substitutes, round_num, no, sub_meta.get("actualCode"),
                )
            race_info["results"].append(enrich_result(item, record, sub_meta, resolved_code))

        sprint_results = []
        for item in raw.get("sprintResults", [])[:8]:
            record, sub_meta, resolved_code = lookup(item)
            sprint_results.append(enrich_result(item, record, sub_meta, resolved_code))
        if sprint_results:
            race_info["sprintResults"] = sprint_results

        pole = raw.get("polePosition")
        if pole:
            pole_record, _, pole_code = lookup(pole)
            race_info["polePosition"] = {
                "time": pole.get("time", ""),
                "code": pole_record.get("code") or pole_code or "",
                "firstName": pole_record.get("firstName", ""),
                "lastName": pole_record.get("lastName", ""),
                "firstNameCn": pole_record.get("firstNameCn", ""),
                "lastNameCn": pole_record.get("lastNameCn", ""),
            }

        qualifying_results = []
        for item in raw.get("qualifyingResults", [])[:3]:
            no = str(item.get("no", ""))
            record, _, resolved_code = lookup(item)
            qualifying_results.append({
                "position": item.get("position"),
                "number": int(no) if no.isdigit() else 0,
                "code": record.get("code") or resolved_code or "",
                "firstName": record.get("firstName", ""),
                "lastName": record.get("lastName", ""),
                "firstNameCn": record.get("firstNameCn", ""),
                "lastNameCn": record.get("lastNameCn", ""),
                "time": item.get("time", ""),
                "q1": item.get("q1", ""),
                "q2": item.get("q2", ""),
                "q3": item.get("q3", ""),
                "laps": item.get("laps"),
            })
        if qualifying_results:
            race_info["qualifyingResults"] = qualifying_results

        all_races.append(race_info)

    all_races.sort(key=lambda item: item["round"] or 0)

    os.makedirs(DATA_DIR, exist_ok=True)
    write_json(OUTPUT_JSON, all_races)
    if substitutes:
        write_json(SUBSTITUTES_JSON, substitutes)

    total_results = sum(len(item["results"]) for item in all_races)
    print(f"已生成 {OUTPUT_JSON}")
    print(f"  共 {len(all_races)} 场比赛，{total_results} 条正赛记录")
    return all_races


if __name__ == "__main__":
    build_results_json()
