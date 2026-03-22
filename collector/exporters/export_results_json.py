#!/usr/bin/env python3
"""
将 collector/results_2026/ 下的单站 JSON 汇总为统一的 results_2026.json。

保留：
- 正赛完整 laps / time
- 冲刺赛前 8
- 排位赛前 3（Q1/Q2/Q3）
"""

import json
import os
import re


CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
COLLECTOR_DIR = os.path.dirname(CURRENT_DIR)
RESULTS_DIR = os.path.join(COLLECTOR_DIR, "results_2026")
DATA_DIR = os.path.join(COLLECTOR_DIR, "data")
DRIVERS_JSON = os.path.join(DATA_DIR, "drivers_2026.json")
SCHEDULE_JSON = os.path.join(DATA_DIR, "schedule_2026.json")
OUTPUT_JSON = os.path.join(DATA_DIR, "results_2026.json")

TEAM_CN_MAP = {
    "Mercedes": "梅赛德斯",
    "Ferrari": "法拉利",
    "Red Bull Racing": "红牛",
    "Red Bull": "红牛",
    "McLaren": "迈凯伦",
    "Aston Martin": "阿斯顿马丁",
    "Alpine": "Alpine",
    "Williams": "威廉姆斯",
    "Haas F1 Team": "哈斯",
    "Haas": "哈斯",
    "Racing Bulls": "Racing Bulls",
    "Audi": "Audi",
    "Cadillac": "Cadillac",
}


def load_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def to_position(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def to_status(value):
    return "Finished" if to_position(value) is not None else "DNF"


def extract_event_id(url):
    match = re.search(r"/races/(\d+)/", url or "")
    return int(match.group(1)) if match else None


def build_results_json():
    if not os.path.exists(RESULTS_DIR):
        print(f"[!] 结果目录不存在: {RESULTS_DIR}")
        return

    drivers = load_json(DRIVERS_JSON)
    no_map = {str(item.get("number", "")): item for item in drivers}

    schedule = load_json(SCHEDULE_JSON)
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

    all_races = []
    result_files = sorted(name for name in os.listdir(RESULTS_DIR) if name.endswith(".json"))

    for filename in result_files:
        raw = load_json(os.path.join(RESULTS_DIR, filename))

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

        for item in raw.get("results", []):
            no = str(item.get("no", ""))
            driver = no_map.get(no, {})
            race_info["results"].append({
                "pos": to_position(item.get("pos")),
                "firstName": driver.get("firstName", ""),
                "lastName": driver.get("lastName", ""),
                "firstNameCn": driver.get("firstNameCn", ""),
                "lastNameCn": driver.get("lastNameCn", ""),
                "code": driver.get("code", ""),
                "number": int(no) if no.isdigit() else 0,
                "team": driver.get("team", ""),
                "teamCn": TEAM_CN_MAP.get(driver.get("team", ""), driver.get("teamCn", "")),
                "points": item.get("points", 0),
                "status": to_status(item.get("pos")),
                "laps": item.get("laps"),
                "time": item.get("time"),
            })

        sprint_results = []
        for item in raw.get("sprintResults", [])[:8]:
            no = str(item.get("no", ""))
            driver = no_map.get(no, {})
            sprint_results.append({
                "pos": to_position(item.get("pos")),
                "firstName": driver.get("firstName", ""),
                "lastName": driver.get("lastName", ""),
                "firstNameCn": driver.get("firstNameCn", ""),
                "lastNameCn": driver.get("lastNameCn", ""),
                "code": driver.get("code", ""),
                "number": int(no) if no.isdigit() else 0,
                "team": driver.get("team", ""),
                "teamCn": TEAM_CN_MAP.get(driver.get("team", ""), driver.get("teamCn", "")),
                "points": item.get("points", 0),
                "status": to_status(item.get("pos")),
                "laps": item.get("laps"),
                "time": item.get("time"),
            })
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

    total_results = sum(len(item["results"]) for item in all_races)
    print(f"已生成 {OUTPUT_JSON}")
    print(f"  共 {len(all_races)} 场比赛，{total_results} 条正赛记录")
    return all_races


if __name__ == "__main__":
    build_results_json()
