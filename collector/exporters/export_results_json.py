#!/usr/bin/env python3
"""
将 collector/results_2026/ 下的单站 JSON 汇总为统一的 results_2026.json。

保留：
- 正赛完整 laps / time
- 冲刺赛前 8
- 排位赛前 3（Q1/Q2/Q3）

新增（v1.4）：
- 双表查表：drivers_2026.json + substitutes_2026.json
- 内联 isSubstitute / replacesCode / replaceReason 字段
- 自动写入 substitutes_2026.json（用于赛季级临时车手表）
"""

import json
import os
import re


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
COLLECTOR_DIR = os.path.dirname(CURRENT_DIR)
RESULTS_DIR = os.path.join(COLLECTOR_DIR, "results_2026")
DATA_DIR = os.path.join(COLLECTOR_DIR, "data")
DRIVERS_JSON = os.path.join(DATA_DIR, "drivers_2026.json")
SUBSTITUTES_JSON = os.path.join(DATA_DIR, "substitutes_2026.json")
SCHEDULE_JSON = os.path.join(DATA_DIR, "schedule_2026.json")
SUBSTITUTIONS_JSON = os.path.join(COLLECTOR_DIR, "scripts", "f1_substitutions_2026.json") \
    if os.path.exists(os.path.join(COLLECTOR_DIR, "scripts", "f1_substitutions_2026.json")) \
    else os.path.join(os.path.dirname(COLLECTOR_DIR), "scripts", "f1_substitutions_2026.json")
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


def load_json(path):
    if not os.path.exists(path):
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


def extract_event_id(url):
    match = re.search(r"/races/(\d+)/", url or "")
    return int(match.group(1)) if match else None


def build_roster_lookup(drivers):
    return {str(item.get("number", "")): item for item in drivers}


def load_substitute_metadata():
    """Return: { slug: { carNumber(str): { replacesCode, reason, actualCode } } }"""
    data = load_json(SUBSTITUTIONS_JSON)
    if not isinstance(data, dict):
        return {}
    output: dict[str, dict[str, dict]] = {}
    for slug, entries in data.items():
        per_car: dict[str, dict] = {}
        for entry in entries or []:
            per_car[str(entry.get("carNumber", ""))] = {
                "replacesCode": entry.get("replacesCode"),
                "reason": entry.get("reason"),
                "actualCode": entry.get("actualCode"),
            }
        output[slug] = per_car
    return output


def record_substitute_appearance(substitutes, slug, round_number, car_number, sub_meta):
    """Update substitutes_2026.json with appearedRounds for this match."""
    actual_code = sub_meta.get("actualCode")
    if not actual_code:
        return
    target = None
    for entry in substitutes:
        if entry.get("code") == actual_code or entry.get("number") == car_number:
            target = entry
            break
    if not target:
        return
    rounds = set(target.get("appearedRounds") or [])
    rounds.add(round_number)
    target["appearedRounds"] = sorted(rounds)


def enrich_result(item, driver, sub_meta):
    """Compose the per-result dict, adding substitute inline fields when applicable."""
    base = {
        "pos": to_position(item.get("pos")),
        "firstName": driver.get("firstName", ""),
        "lastName": driver.get("lastName", ""),
        "firstNameCn": driver.get("firstNameCn", ""),
        "lastNameCn": driver.get("lastNameCn", ""),
        "code": driver.get("code", ""),
        "number": int(str(item.get("no", "0"))) if str(item.get("no", "")).isdigit() else 0,
        "team": driver.get("team", ""),
        "teamCn": TEAM_CN_MAP.get(driver.get("team", ""), driver.get("teamCn", "")),
        "points": item.get("points", 0),
        "status": to_status(item.get("pos")),
        "laps": item.get("laps"),
        "time": item.get("time"),
    }
    if sub_meta:
        if sub_meta.get("replacesCode"):
            base["replacesCode"] = sub_meta["replacesCode"]
        if sub_meta.get("reason"):
            base["replaceReason"] = sub_meta["reason"]
        base["isSubstitute"] = True
    return base


def build_results_json():
    if not os.path.exists(RESULTS_DIR):
        print(f"[!] 结果目录不存在: {RESULTS_DIR}")
        return

    drivers = load_json(DRIVERS_JSON) or []
    no_map = build_roster_lookup(drivers)

    substitutes = load_json(SUBSTITUTES_JSON) or []
    sub_no_map = {str(item.get("number", "")): item for item in substitutes}

    schedule = load_json(SCHEDULE_JSON) or []
    slug_date_map: dict[str, str] = {}
    slug_round_map: dict[str, int] = {}
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

        def lookup_driver(no_str):
            sub_meta = race_subs.get(no_str)
            if sub_meta:
                # Prefer substitute record (covers non-roster drivers)
                actual_code = sub_meta.get("actualCode")
                sub_entry = next(
                    (s for s in substitutes if s.get("code") == actual_code or str(s.get("number")) == no_str),
                    None,
                )
                if sub_entry:
                    return sub_entry, sub_meta
                # Fallback to no_map; UI will still see the inline substitute flag
                return no_map.get(no_str, {}), sub_meta
            return no_map.get(no_str, {}), None

        for item in raw.get("results", []):
            no = str(item.get("no", ""))
            driver, sub_meta = lookup_driver(no)
            if sub_meta and round_num:
                record_substitute_appearance(substitutes, slug, round_num, int(no) if no.isdigit() else 0, sub_meta)
            race_info["results"].append(enrich_result(item, driver, sub_meta))

        sprint_results = []
        for item in raw.get("sprintResults", [])[:8]:
            no = str(item.get("no", ""))
            driver, sub_meta = lookup_driver(no)
            sprint_results.append(enrich_result(item, driver, sub_meta))
        if sprint_results:
            race_info["sprintResults"] = sprint_results

        pole = raw.get("polePosition")
        if pole:
            pole_no = str(pole.get("no", ""))
            pole_driver = no_map.get(pole_no, {})
            race_info["polePosition"] = {
                "time": pole.get("time", ""),
                "code": pole_driver.get("code", ""),
                "firstName": pole_driver.get("firstName", ""),
                "lastName": pole_driver.get("lastName", ""),
                "firstNameCn": pole_driver.get("firstNameCn", ""),
                "lastNameCn": pole_driver.get("lastNameCn", ""),
            }

        qualifying_results = []
        for item in raw.get("qualifyingResults", [])[:3]:
            no = str(item.get("no", ""))
            driver = no_map.get(no, {})
            qualifying_results.append({
                "position": item.get("position"),
                "number": int(no) if no.isdigit() else 0,
                "code": driver.get("code", ""),
                "firstName": driver.get("firstName", ""),
                "lastName": driver.get("lastName", ""),
                "firstNameCn": driver.get("firstNameCn", ""),
                "lastNameCn": driver.get("lastNameCn", ""),
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
    with open(OUTPUT_JSON, "w", encoding="utf-8") as handle:
        json.dump(all_races, handle, indent=2, ensure_ascii=False)
        handle.write("\n")

    # Persist updated substitute roster
    if substitutes:
        write_json(SUBSTITUTES_JSON, substitutes)

    total_results = sum(len(item["results"]) for item in all_races)
    print(f"已生成 {OUTPUT_JSON}")
    print(f"  共 {len(all_races)} 场比赛，{total_results} 条正赛记录")
    return all_races


if __name__ == "__main__":
    build_results_json()
