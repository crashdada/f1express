#!/usr/bin/env python3
"""Backfill CLI for 2026 race results from formula1.com.

This is a thin wrapper around the shared ``F1DataCollector`` parser
(``collector/scrapers/scraper.py``) so that periodic collection and manual
backfill always emit the same per-race schema (pos / no / code / driver /
team / laps / time / points). It writes one JSON per race to
``collector/results_2026/<slug>_results.json``, which
``collector/exporters/export_results_json.py`` then aggregates.

Usage:
    python spider.py                    # scrape every race in the schedule
    python spider.py spain azerbaijan   # scrape specific slugs
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = CURRENT_DIR.parent
SCRAPERS_DIR = CURRENT_DIR / "scrapers"
if str(SCRAPERS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRAPERS_DIR))

from scraper import F1DataCollector  # noqa: E402

SCHEDULE_JSON_CANDIDATES = [
    CURRENT_DIR / "data" / "schedule_2026.json",
    WEBSITE_DIR / "storage" / "schedule_2026.json",
]
RESULTS_DIR = CURRENT_DIR / "results_2026"


def load_schedule() -> list[dict]:
    for candidate in SCHEDULE_JSON_CANDIDATES:
        if candidate.exists():
            with candidate.open("r", encoding="utf-8") as fh:
                return json.load(fh)
    raise SystemExit("schedule_2026.json not found in expected locations")


def extract_event_id(url: str) -> int | None:
    match = re.search(r"/races/(\d+)/", url or "")
    return int(match.group(1)) if match else None


def discover_event_id(collector: F1DataCollector, slug: str) -> int | None:
    """Look up F1's internal race id from the race detail page."""
    html = collector.fetch_page(
        f"https://www.formula1.com/en/racing/{collector.season}/{slug}",
        max_retries=1,
    )
    if not html:
        return None
    match = re.search(r'/en/results/\d+/races/(\d+)/[^"\']+/race-result', html)
    return int(match.group(1)) if match else None


def write_result(slug: str, payload: dict) -> Path:
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    target = RESULTS_DIR / f"{slug}_results.json"
    with target.open("w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
    return target


def scrape_round(collector: F1DataCollector, race: dict) -> tuple[str, str]:
    """Scrape one race. Returns (slug, status)."""
    slug = race.get("slug")
    if not slug:
        return "?", "missing slug"

    event_id = (
        race.get("eventId")
        or extract_event_id(race.get("url", ""))
        or discover_event_id(collector, slug)
    )
    if not event_id:
        return slug, "could not resolve eventId"

    url = f"https://www.formula1.com/en/results/{collector.season}/races/{event_id}/{slug}/race-result"
    html = collector.fetch_page(url, max_retries=2)
    if not html:
        return slug, "fetch error"

    rows = collector.get_race_results(html)
    if not rows:
        return slug, "no results yet"

    payload = {
        "round": f"ROUND {race.get('roundNumber')}",
        "eventId": event_id,
        "country": race.get("country", ""),
        "slug": slug,
        "url": url,
        "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "results": rows,
    }
    write_result(slug, payload)
    return slug, f"saved {len(rows)} rows"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("slugs", nargs="*", help="optional slug filter")
    parser.add_argument("--all", action="store_true", help="scrape every round in schedule")
    parser.add_argument("--season", type=int, default=2026, help="season year")
    args = parser.parse_args()

    schedule = load_schedule()
    if args.slugs:
        targets = [r for r in schedule if r.get("slug") in args.slugs]
    else:
        targets = schedule

    collector = F1DataCollector(season=args.season)
    for race in targets:
        slug, status = scrape_round(collector, race)
        print(f"[spider] {slug}: {status}")
        time.sleep(0.5)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
