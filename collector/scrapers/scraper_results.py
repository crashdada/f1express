#!/usr/bin/env python3
"""
F1 赛后结果采集器

输出到 collector/results_<season>/ 下的单站 JSON，包含：
- 正赛结果（含 laps / time）
- 冲刺赛前 8（如有）
- 排位赛前 3（含 Q1/Q2/Q3）
"""

import argparse
import datetime
import json
import os
import re
import sys

from scraper import F1DataCollector


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
COLLECTOR_DIR = os.path.dirname(SCRIPT_DIR)
POST_RACE_GRACE_HOURS = 5
AUTO_SCRAPE_WINDOW_HOURS = 24


def get_schedule_file(season):
    return os.path.join(COLLECTOR_DIR, "data", f"schedule_{season}.json")


def get_results_dir(season):
    return os.path.join(COLLECTOR_DIR, f"results_{season}")


def load_schedule(season):
    schedule_file = get_schedule_file(season)
    if not os.path.exists(schedule_file):
        print(f"[!] 赛历不存在: {schedule_file}")
        return []
    with open(schedule_file, "r", encoding="utf-8") as handle:
        return json.load(handle)


def find_recent_race(schedule, season):
    now_utc = datetime.datetime.now(datetime.timezone.utc)

    for race in schedule:
        if race.get("isTest", False):
            continue

        race_session = None
        for sess in race.get("sessions", []):
            if sess.get("name", "").upper() == "RACE":
                race_session = sess
                break

        if not race_session or not race_session.get("time"):
            continue

        try:
            time_str = race_session["time"].replace("Z", "+00:00")
            race_time_utc = datetime.datetime.fromisoformat(time_str)
            target_scrape_time = race_time_utc + datetime.timedelta(hours=POST_RACE_GRACE_HOURS)
            delta = now_utc - target_scrape_time
            if datetime.timedelta(0) <= delta <= datetime.timedelta(hours=AUTO_SCRAPE_WINDOW_HOURS):
                return race
        except Exception as exc:
            print(f"解析时间出错: {exc}")
            continue

    return None


def find_race_by_round(schedule, round_num):
    for race in schedule:
        round_text = race.get("round", "")
        match = re.search(r"(\d+)", round_text)
        if match and int(match.group(1)) == round_num:
            return race
    return None


def discover_race_urls(collector):
    listing_url = f"{collector.base_url}/en/results/{collector.season}/races"
    print(f"   发现比赛 URL 列表: {listing_url}")

    html = collector.fetch_page(listing_url, max_retries=2)
    if not html:
        print("   [!] 无法获取 results 列表页")
        return {}

    pattern = r"/en/results/\d+/races/(\d+)/([\w-]+)/race-result"
    matches = re.findall(pattern, html)

    race_urls = {}
    for race_id, slug in matches:
        race_urls[slug] = f"{collector.base_url}/en/results/{collector.season}/races/{race_id}/{slug}/race-result"
        print(f"   发现: {slug} -> raceId={race_id}")

    if not race_urls:
        print("   [!] 未找到任何 race-result 链接")

    return race_urls


def extract_event_id(url: str):
    match = re.search(r"/races/(\d+)/", url or "")
    return int(match.group(1)) if match else None


def scrape_race_results(collector, race, race_urls=None):
    slug = race.get("slug", "")
    country = race.get("country", race.get("location", "unknown"))
    round_text = race.get("round", "")

    if race_urls and slug in race_urls:
        result_url = race_urls[slug]
    else:
        result_url = f"{collector.base_url}/en/results/{collector.season}/races/{slug}/race-result"
        print(f"   [fallback] 未在列表中找到 {slug}，使用回退 URL")

    print(f"\n采集: {country} ({round_text})")
    print(f"   Race URL: {result_url}")

    html = collector.fetch_page(result_url, max_retries=2)
    if not html:
        print("   [!] 正赛页面获取失败")
        return None

    results = collector.get_race_results(html)
    if not results:
        print("   [!] 未找到正赛结果数据")
        return None

    output = {
        "round": round_text,
        "eventId": extract_event_id(result_url),
        "country": country,
        "slug": slug,
        "url": result_url,
        "scraped_at": datetime.datetime.now().isoformat(),
        "results": results,
    }

    has_sprint = any(s.get("name") == "Sprint" for s in race.get("sessions", []))
    if has_sprint:
        sprint_url = result_url.replace("/race-result", "/sprint-results")
        print(f"   Sprint URL: {sprint_url}")
        sprint_html = collector.fetch_page(sprint_url, max_retries=1)
        if sprint_html:
            sprint_results = collector.get_race_results(sprint_html)
            if sprint_results:
                output["sprintResults"] = sprint_results[:8]
                print(f"   获取到冲刺赛前 {len(output['sprintResults'])} 名")
            else:
                print("   [!] 未找到冲刺赛结果数据")
        else:
            print("   [!] 冲刺赛页面获取失败")

    qualifying_url = result_url.replace("/race-result", "/qualifying")
    print(f"   Qualifying URL: {qualifying_url}")
    qualifying_html = collector.fetch_page(qualifying_url, max_retries=1)
    if qualifying_html:
        qualifying_results = collector.get_qualifying_results(qualifying_html, limit=3)
        if qualifying_results:
            output["qualifyingResults"] = qualifying_results
            output["polePosition"] = {
                "no": qualifying_results[0].get("no"),
                "time": qualifying_results[0].get("time"),
            }
            print(
                f"   获取到排位赛 Top {len(qualifying_results)}，"
                f"杆位 #{qualifying_results[0].get('no')} {qualifying_results[0].get('time')}"
            )
        else:
            print("   [!] 未能解析排位赛结果")
    else:
        print("   [!] 排位赛页面获取失败")

    print("   采集完成")
    return output


def save_results(data, race, season):
    results_dir = get_results_dir(season)
    os.makedirs(results_dir, exist_ok=True)

    slug = race.get("slug", "unknown")
    filepath = os.path.join(results_dir, f"{slug}_results.json")

    with open(filepath, "w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=4)

    print(f"   已保存到 {filepath}")
    return filepath


def main():
    parser = argparse.ArgumentParser(description="F1 赛后结果采集")
    parser.add_argument("--force", action="store_true", help="强制采集最近一场")
    parser.add_argument("--round", type=int, help="采集指定轮次")
    parser.add_argument("--season", type=int, default=datetime.datetime.now().year, help="指定赛季")
    args = parser.parse_args()

    print("=" * 50)
    print(f"F1 {args.season} Results Scraper")
    print("=" * 50)

    season = args.season
    schedule = load_schedule(season)
    if not schedule:
        sys.exit(1)

    collector = F1DataCollector(season=season)

    if args.round:
        race = find_race_by_round(schedule, args.round)
        if not race:
            print(f"[!] 未找到第 {args.round} 轮比赛")
            sys.exit(1)
    elif args.force:
        races = [r for r in schedule if not r.get("isTest", False)]
        now = datetime.datetime.now(datetime.timezone.utc)
        race = None
        for item in reversed(races):
            race_session = next((s for s in item.get("sessions", []) if s.get("name", "").upper() == "RACE"), None)
            if race_session and race_session.get("time"):
                race_time = datetime.datetime.fromisoformat(race_session["time"].replace("Z", "+00:00"))
                if race_time <= now + datetime.timedelta(days=1):
                    race = item
                    break
        if not race:
            race = races[0] if races else None
        if not race:
            print("[!] 赛历中无有效赛事")
            sys.exit(1)
    else:
        race = find_recent_race(schedule, season)
        if not race:
            print("今天不在赛后窗口内，无需采集。")
            print("使用 --force 或 --round N 强制执行。")
            sys.exit(0)

    print("\n获取官方 results 列表...")
    race_urls = discover_race_urls(collector)

    results = scrape_race_results(collector, race, race_urls)
    if results:
        save_results(results, race, season)
        print("\n采集成功")
    else:
        print("\n采集失败")
        sys.exit(1)


if __name__ == "__main__":
    main()
