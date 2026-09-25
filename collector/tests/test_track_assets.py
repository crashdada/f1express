import pathlib
import sys

PROJECT_ROOT = pathlib.Path(__file__).resolve().parents[2]
for candidate in (PROJECT_ROOT / "collector", PROJECT_ROOT / "collector" / "scrapers"):
    if str(candidate) not in sys.path:
        sys.path.insert(0, str(candidate))

from download_assets import _local_base, track_detailed_url, track_outline_url  # noqa: E402
from scraper import F1DataCollector  # noqa: E402


def test_extract_track_slug_from_official_public_id():
    full = '"circuitImage":{"public_id":"common/f1/2026/track/2026trackkualalumpurblackoutline"}'
    assert F1DataCollector._extract_track_slug(full) == "kualalumpur"

    full = '"circuitImage":{"public_id":"common/f1/2026/track/2026trackmadringblackoutline"}'
    assert F1DataCollector._extract_track_slug(full) == "madring"


def test_extract_track_slug_returns_none_without_match():
    assert F1DataCollector._extract_track_slug("no circuit image here") is None
    assert F1DataCollector._extract_track_slug(
        '"circuitImage":{"public_id":"other/path/foo"}'
    ) is None


def test_track_asset_urls_follow_official_cdn_pattern():
    assert track_outline_url("kualalumpur").endswith(
        "/common/f1/2026/track/2026trackkualalumpurblackoutline.svg"
    )
    assert track_detailed_url("kualalumpur").endswith(
        "/common/f1/2026/track/2026trackkualalumpurdetailed.webp"
    )


def test_local_base_extraction():
    assert _local_base("/photos/seasons/2026/tracks/kualalumpur_outline.svg", "x") == "kualalumpur"
    assert _local_base("/photos/seasons/2026/tracks/abu-dhabi_detailed.webp", "x") == "abu-dhabi"
    assert _local_base(None, "fallback") == "fallback"
