#!/usr/bin/env python3
"""Spider for 2026 race results from formula1.com.

Reads schedule from collector/data/schedule_2026.json (or storage fallback),
fetches each race's race-result page, parses the classification table, and
writes per-race JSON to collector/results_2026/<slug>_results.json.

Usage:
    python spider.py            # scrape all races
    python spider.py spain azerbaijan   # scrape specific slugs
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from html import unescape
from pathlib import Path

import urllib.request

CURRENT_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = CURRENT_DIR.parent
SCHEDULE_JSON_CANDIDATES = [
    CURRENT_DIR / "data" / "schedule_2026.json",
    WEBSITE_DIR / "storage" / "schedule_2026.json",
]
RESULTS_DIR = CURRENT_DIR / "results_2026"

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
HTTP_TIMEOUT = 30


def load_schedule() -> list[dict]:
    for candidate in SCHEDULE_JSON_CANDIDATES:
        if candidate.exists():
            with candidate.open("r", encoding="utf-8") as fh:
                return json.load(fh)
    raise SystemExit("schedule_2026.json not found in expected locations")


def discover_event_id(slug: str) -> int | None:
    """Look up F1's internal race event id from the race detail page.

    The detail page embeds a `resultsPageUrl` like
    `/en/results/2026/races/<id>/<slug>/race-result` from which we can read
    the id.
    """
    try:
        html = fetch_html(f"https://www.formula1.com/en/racing/2026/{slug}")
    except Exception:
        return None
    match = re.search(r'/en/results/2026/races/(\d+)/[^"\']+/race-result', html)
    return int(match.group(1)) if match else None


def fetch_html(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as resp:
        charset = resp.headers.get_content_charset() or "utf-8"
        return resp.read().decode(charset, errors="replace")


def extract_event_id(url: str) -> int | None:
    match = re.search(r"/races/(\d+)/", url or "")
    return int(match.group(1)) if match else None


def parse_race_rows(html: str) -> list[dict]:
    """Pull the classification table rows from the F1 results page."""
    rows: list[dict] = []
    for tr_match in re.finditer(r"<tr[^>]*>([\s\S]*?)</tr>", html):
        body = tr_match.group(1)
        cells = re.findall(r"<td[^>]*>([\s\S]*?)</td>", body)
        if len(cells) < 6:
            continue
        cleaned = []
        for cell in cells:
            text = re.sub(r"<[^>]+>", " ", cell)
            text = unescape(text)
            text = re.sub(r"\s+", " ", text).strip()
            cleaned.append(text)
        # Expected: pos, no, driver, team, laps, time/retired, pts (last cell = points)
        if not cleaned[0].isdigit():
            continue
        rows.append({
            "pos": cleaned[0],
            "no": cleaned[1],
            "driver": cleaned[2],
            "team": cleaned[3] if len(cleaned) > 3 else "",
            "laps": cleaned[4] if len(cleaned) > 4 else "",
            "time": cleaned[5] if len(cleaned) > 5 else "",
            "points": cleaned[-1],
        })
    return rows


def write_result(slug: str, payload: dict) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    target = RESULTS_DIR / f"{slug}_results.json"
    with target.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    return target


def scrape_round(race: dict) -> tuple[str, str]:
    """Scrape one race. Returns (slug, status)."""
    slug = race.get("slug")
    event_id = (
        race.get("eventId")
        or extract_event_id(race.get("url", ""))
        or discover_event_id(slug)
    )
    if not slug:
        return "?", "missing slug"
    if not event_id:
        return slug, "could not resolve eventId"
    url = f"https://www.formula1.com/en/results/2026/races/{event_id}/{slug}/race-result"
    try:
        html = fetch_html(url)
    except Exception as exc:  # urllib errors
        return slug, f"fetch error: {exc}"

    rows = parse_race_rows(html)
    if not rows:
        return slug, "no results yet"

    enriched = []
    for r in rows:
        code = ""
        # driver field ends with the 3-letter driver code, e.g. "Kimi Antonelli ANT"
        tokens = r["driver"].split()
        if tokens:
            last = tokens[-1]
            if len(last) == 3 and last.isupper():
                code = last
        enriched.append({
            "pos": r["pos"],
            "no": r["no"],
            "code": code,
            "driver": r["driver"],
            "team": r["team"],
            "laps": r["laps"],
            "time": r["time"],
            "points": r["points"],
        })

    payload = {
        "round": f"ROUND {race.get('roundNumber')}",
        "eventId": event_id,
        "country": race.get("country", ""),
        "slug": slug,
        "url": url,
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "results": enriched,
    }
    write_result(slug, payload)
    return slug, f"saved {len(rows)} rows"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("slugs", nargs="*", help="optional slug filter")
    parser.add_argument("--all", action="store_true", help="scrape every round in schedule")
    args = parser.parse_args()

    schedule = load_schedule()
    if args.slugs:
        targets = [r for r in schedule if r.get("slug") in args.slugs]
    else:
        targets = schedule

    for race in targets:
        slug, status = scrape_round(race)
        print(f"[spider] {slug}: {status}")
        time.sleep(0.5)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
