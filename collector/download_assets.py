#!/usr/bin/env python3
"""Download 2026 season assets from the official Formula 1 CDN.

Track outlines / detailed maps are driven by the official circuit slug parsed
by ``collector/scrapers/scraper.py`` (``trackSlug``), so there is no hardcoded
display-slug -> circuit-slug map. Files are written straight into the runtime
photo directory (``storage/photos/seasons/<year>/...``) that the frontend and
``scripts/pipeline/update_photo_index.py`` read.

Usage:
    python download_assets.py                 # tracks only (skip existing files)
    python download_assets.py --force         # overwrite existing files
    python download_assets.py bahrain spain   # only these schedule slugs
    python download_assets.py --all           # tracks + drivers + teams
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import requests

COLLECTOR_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = COLLECTOR_DIR.parent
DATA_DIR = COLLECTOR_DIR / "data"
PHOTOS_DIR = WEBSITE_DIR / "storage" / "photos" / "seasons"

CDN_BASE = "https://media.formula1.com/image/upload"
CDN_VERSION = "v1740000000"
OUTLINE_TX = "c_lfill,w_3392"
DETAILED_TX = "c_fit,h_704/q_auto"


def track_outline_url(track_slug: str) -> str:
    return (
        f"{CDN_BASE}/{OUTLINE_TX}/{CDN_VERSION}/common/f1/2026/track/"
        f"2026track{track_slug}blackoutline.svg"
    )


def track_detailed_url(track_slug: str) -> str:
    return (
        f"{CDN_BASE}/{DETAILED_TX}/{CDN_VERSION}/common/f1/2026/track/"
        f"2026track{track_slug}detailed.webp"
    )


def download_file(url: str, target: Path, force: bool = False) -> bool:
    if target.exists() and not force and target.stat().st_size > 100:
        return True
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        response = requests.get(url, timeout=25)
    except Exception as exc:  # network errors
        print(f"  [!] {exc}: {url}")
        return False
    if response.status_code == 200 and response.content:
        target.write_bytes(response.content)
        return True
    print(f"  [!] status {response.status_code}: {url}")
    return False


def _local_base(image_path, fallback: str) -> str:
    if image_path:
        stem = os.path.splitext(os.path.basename(image_path))[0]
        for suffix in ("_outline", "_detailed"):
            if stem.endswith(suffix):
                return stem[: -len(suffix)]
    return fallback


def process_schedule(year: int, force: bool, only_slugs: set[str]) -> bool:
    path = DATA_DIR / f"schedule_{year}.json"
    if not path.exists():
        print(f"[!] schedule not found: {path}")
        return False

    with path.open("r", encoding="utf-8") as fh:
        schedule = json.load(fh)

    tracks_dir = PHOTOS_DIR / str(year) / "tracks"
    for event in schedule:
        slug = event.get("slug", "")
        if only_slugs and slug not in only_slugs:
            continue

        local_base = _local_base(event.get("image"), event.get("trackSlug") or slug)
        track_slug = event.get("trackSlug") or local_base
        outline_ok = download_file(
            track_outline_url(track_slug), tracks_dir / f"{local_base}_outline.svg", force
        )
        detailed_ok = download_file(
            track_detailed_url(track_slug), tracks_dir / f"{local_base}_detailed.webp", force
        )
        event["image"] = f"/photos/seasons/{year}/tracks/{local_base}_outline.svg"
        event["detailedImage"] = f"/photos/seasons/{year}/tracks/{local_base}_detailed.webp"
        status = "OK" if outline_ok and detailed_ok else "!!"
        print(f"  [{status}] {slug:<22} trackSlug={track_slug:<16} base={local_base}")

    with path.open("w", encoding="utf-8") as fh:
        json.dump(schedule, fh, ensure_ascii=False, indent=4)
    print(f"[OK] schedule_{year}.json track images localized")
    return True


def process_drivers(year: int, force: bool) -> None:
    path = DATA_DIR / f"drivers_{year}.json"
    if not path.exists():
        return
    with path.open("r", encoding="utf-8") as fh:
        drivers = json.load(fh)

    drivers_dir = PHOTOS_DIR / str(year) / "drivers"
    for item in drivers:
        first = item.get("firstName", "").lower().replace(" ", "_")
        last = item.get("lastName", "").lower().replace(" ", "_")
        if not first or not last:
            continue
        url = item.get("officialImage", "")
        target = drivers_dir / f"{first}_{last}.webp"
        if url.startswith("http"):
            download_file(url, target, force)
        item["image"] = f"/photos/seasons/{year}/drivers/{first}_{last}.webp"

    with path.open("w", encoding="utf-8") as fh:
        json.dump(drivers, fh, ensure_ascii=False, indent=4)
    print(f"[OK] drivers_{year}.json images localized")


def process_teams(year: int, force: bool) -> None:
    path = DATA_DIR / f"teams_{year}.json"
    if not path.exists():
        return
    with path.open("r", encoding="utf-8") as fh:
        teams = json.load(fh)

    teams_dir = PHOTOS_DIR / str(year) / "teams"
    for item in teams:
        tid = item.get("id", "unknown")
        for url_key, out_key, suffix in (
            ("officialLogo", "logo", "logo"),
            ("officialCar", "carImage", "car"),
        ):
            url = item.get(url_key, "")
            target = teams_dir / f"{tid}_{suffix}.webp"
            if url.startswith("http"):
                download_file(url, target, force)
            item[out_key] = f"/photos/seasons/{year}/teams/{tid}_{suffix}.webp"

    with path.open("w", encoding="utf-8") as fh:
        json.dump(teams, fh, ensure_ascii=False, indent=4)
    print(f"[OK] teams_{year}.json images localized")


def main() -> int:
    parser = argparse.ArgumentParser(description="Download 2026 F1 season assets")
    parser.add_argument("slugs", nargs="*", help="optional schedule slug filter")
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--force", action="store_true", help="overwrite existing files")
    parser.add_argument("--all", action="store_true", help="also refresh drivers and teams")
    args = parser.parse_args()

    print(f"Downloading {args.year} assets (force={args.force})...")
    process_schedule(args.year, args.force, set(args.slugs))
    if args.all:
        process_drivers(args.year, args.force)
        process_teams(args.year, args.force)
    print("Asset download complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
