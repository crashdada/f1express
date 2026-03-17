#!/usr/bin/env python3
"""
F1 Data Pipeline - Integrity Test Suite
========================================
Comprehensive test suite for validating the f1.db database after pipeline execution.
Run after sync_f1_data.py to ensure data consistency.

Usage:
    python scripts/tests/test_data_integrity.py              # Run all tests
    python scripts/tests/test_data_integrity.py --verbose     # Verbose output
    python scripts/tests/test_data_integrity.py --quick       # Quick smoke tests only
"""

import sqlite3
import os
import sys
import time
from pathlib import Path

# Add parent directory to sys.path to import f1_config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import get_path, ensure_dirs

# ── Configuration ─────────────────────────────────────────────────────────────

ensure_dirs()
DB_PATH = str(get_path('db'))

# Known-good reference values for key drivers (source: Wikipedia/StatsF1)
# Keys are (first_name, last_name) tuples to handle multi-word names like "Juan Manuel"
REFERENCE_DRIVERS = {
    ("Lewis", "Hamilton"):       {"wins_min": 103, "podiums_min": 197, "poles_min": 104, "wdc": 7},
    ("Michael", "Schumacher"):   {"wins_min": 91,  "podiums_min": 155, "poles_min": 68,  "wdc": 7},
    ("Max", "Verstappen"):       {"wins_min": 62,  "podiums_min": 110, "poles_min": 40,  "wdc": 4},
    ("Sebastian", "Vettel"):     {"wins_min": 53,  "podiums_min": 122, "poles_min": 57,  "wdc": 4},
    ("Ayrton", "Senna"):         {"wins_min": 41,  "podiums_min": 80,  "poles_min": 63,  "wdc": 3},
    ("Juan Manuel", "Fangio"):   {"wins_min": 24,  "podiums_min": 35,  "poles_min": 29,  "wdc": 5},
    ("Alain", "Prost"):          {"wins_min": 51,  "podiums_min": 106, "poles_min": 33,  "wdc": 4},
}

# Known WDC champions for validation
KNOWN_CHAMPIONS = {
    2024: "Max Verstappen",
    2023: "Max Verstappen",
    2022: "Max Verstappen",
    2021: "Max Verstappen",
    2020: "Lewis Hamilton",
    2019: "Lewis Hamilton",
    2018: "Lewis Hamilton",
    2017: "Lewis Hamilton",
    2016: "Nico Rosberg",
    2015: "Lewis Hamilton",
    2010: "Sebastian Vettel",
    2005: "Fernando Alonso",
    2004: "Michael Schumacher",
    2000: "Michael Schumacher",
    1994: "Michael Schumacher",
    1991: "Ayrton Senna",
    1988: "Ayrton Senna",
    1957: "Juan Manuel Fangio",
    1951: "Juan Manuel Fangio",
}

# ── Test Framework ────────────────────────────────────────────────────────────

class TestResult:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.warnings = 0
        self.details = []

    def ok(self, name, msg=""):
        self.passed += 1
        self.details.append(("PASS", name, msg))

    def fail(self, name, msg=""):
        self.failed += 1
        self.details.append(("FAIL", name, msg))

    def warn(self, name, msg=""):
        self.warnings += 1
        self.details.append(("WARN", name, msg))

    def summary(self):
        total = self.passed + self.failed + self.warnings
        return f"{self.passed} passed, {self.failed} failed, {self.warnings} warnings / {total} total"

results = TestResult()
VERBOSE = "--verbose" in sys.argv or "-v" in sys.argv
QUICK = "--quick" in sys.argv


def test(name):
    """Decorator for test functions"""
    def decorator(func):
        func._test_name = name
        return func
    return decorator


# ── Schema Tests ──────────────────────────────────────────────────────────────

@test("Schema: All required tables exist")
def test_required_tables(conn):
    required = [
        'circuits', 'races', 'race_results', 'drivers', 'teams',
        'qualifying', 'driver_season_stats', 'driver_championships',
        'team_season_stats', 'team_championships', 'seasons',
        'driver_photos', 'team_photos', 'sprint_races', 'sprint_results'
    ]
    existing = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    
    missing = [t for t in required if t not in existing]
    if missing:
        results.fail("Schema: required tables", f"Missing: {missing}")
    else:
        results.ok("Schema: required tables", f"All {len(required)} tables present")


@test("Schema: Key columns exist")
def test_key_columns(conn):
    checks = [
        ("drivers", ["driver_id", "first_name", "last_name", "code", "number",
                      "first_name_cn", "last_name_cn", "birth_date", "birth_place"]),
        ("race_results", ["result_id", "race_id", "driver_id", "team_id", "position", "points"]),
        ("qualifying", ["qualifying_id", "race_id", "driver_id", "position", "pole_time"]),
        ("driver_season_stats", ["stat_id", "driver_id", "season", "wins", "podiums", "poles", "points"]),
    ]
    for table, expected_cols in checks:
        actual = [c[1] for c in conn.execute(f"PRAGMA table_info({table})").fetchall()]
        missing = [c for c in expected_cols if c not in actual]
        if missing:
            results.fail(f"Schema: {table} columns", f"Missing: {missing}")
        else:
            results.ok(f"Schema: {table} columns")


# ── Volume Tests ──────────────────────────────────────────────────────────────

@test("Volume: Minimum row counts")
def test_row_counts(conn):
    thresholds = {
        "race_results": 20000,
        "drivers": 700,
        "teams": 100,
        "races": 1000,
        "circuits": 100,
        "qualifying": 1000,
        "driver_season_stats": 2500,
        "driver_championships": 2500,
        "seasons": 70,
    }
    for table, min_count in thresholds.items():
        count = conn.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        if count < min_count:
            results.fail(f"Volume: {table}", f"Only {count} rows (min: {min_count})")
        else:
            results.ok(f"Volume: {table}", f"{count} rows")


@test("Volume: Season coverage")
def test_season_coverage(conn):
    min_s = conn.execute("SELECT min(season) FROM seasons").fetchone()[0]
    max_s = conn.execute("SELECT max(season) FROM seasons").fetchone()[0]
    
    if min_s != 1950:
        results.fail("Volume: first season", f"Expected 1950, got {min_s}")
    else:
        results.ok("Volume: first season", "1950")
    
    if max_s < 2024:
        results.fail("Volume: latest season", f"Expected >= 2024, got {max_s}")
    else:
        results.ok("Volume: latest season", str(max_s))


# ── Referential Integrity Tests ───────────────────────────────────────────────

@test("Integrity: No orphan race_results")
def test_orphan_race_results(conn):
    orphans = conn.execute("""
        SELECT count(*) FROM race_results rr
        LEFT JOIN races r ON rr.race_id = r.race_id
        WHERE r.race_id IS NULL
    """).fetchone()[0]
    if orphans > 0:
        results.fail("Integrity: orphan race_results", f"{orphans} results without race")
    else:
        results.ok("Integrity: orphan race_results")


@test("Integrity: No orphan driver_season_stats")
def test_orphan_stats(conn):
    orphans = conn.execute("""
        SELECT count(*) FROM driver_season_stats ds
        LEFT JOIN drivers d ON ds.driver_id = d.driver_id
        WHERE d.driver_id IS NULL
    """).fetchone()[0]
    if orphans > 0:
        results.fail("Integrity: orphan stats", f"{orphans} stats without driver")
    else:
        results.ok("Integrity: orphan stats")


@test("Integrity: No duplicate driver_season_stats")
def test_duplicate_stats(conn):
    dupes = conn.execute("""
        SELECT driver_id, season, count(*) as cnt
        FROM driver_season_stats
        GROUP BY driver_id, season
        HAVING cnt > 1
    """).fetchall()
    if dupes:
        results.fail("Integrity: duplicate stats", f"{len(dupes)} duplicates found")
    else:
        results.ok("Integrity: duplicate stats")


@test("Integrity: No duplicate driver_championships")
def test_duplicate_champs(conn):
    dupes = conn.execute("""
        SELECT driver_id, season, count(*) as cnt
        FROM driver_championships
        GROUP BY driver_id, season
        HAVING cnt > 1
    """).fetchall()
    if dupes:
        results.fail("Integrity: duplicate championships", f"{len(dupes)} duplicates")
    else:
        results.ok("Integrity: duplicate championships")


# ── Champion Validation Tests ─────────────────────────────────────────────────

@test("Champions: Known WDC champions match")
def test_known_champions(conn):
    for year, expected_name in KNOWN_CHAMPIONS.items():
        row = conn.execute("""
            SELECT d.first_name || ' ' || d.last_name as name
            FROM driver_championships dc
            JOIN drivers d ON dc.driver_id = d.driver_id
            WHERE dc.season = ? AND dc.rank = 1
        """, (year,)).fetchone()
        
        if not row:
            results.fail(f"Champion {year}", f"No rank=1 found")
        elif row[0] != expected_name:
            results.fail(f"Champion {year}", f"Expected '{expected_name}', got '{row[0]}'")
        else:
            results.ok(f"Champion {year}", row[0])


@test("Champions: Total WDC counts match reference")
def test_wdc_counts(conn):
    for (first, last), ref in REFERENCE_DRIVERS.items():
        driver_name = f"{first} {last}"
        
        count = conn.execute("""
            SELECT count(*) FROM driver_championships dc
            JOIN drivers d ON dc.driver_id = d.driver_id
            WHERE d.first_name = ? AND d.last_name = ? AND dc.rank = 1
        """, (first, last)).fetchone()[0]
        
        if count != ref["wdc"]:
            results.fail(f"WDC count: {driver_name}", f"Expected {ref['wdc']}, got {count}")
        else:
            results.ok(f"WDC count: {driver_name}", str(count))


# ── Statistical Accuracy Tests ────────────────────────────────────────────────

@test("Stats: Key driver career totals")
def test_driver_career_stats(conn):
    for (first, last), ref in REFERENCE_DRIVERS.items():
        driver_name = f"{first} {last}"
        
        row = conn.execute("""
            SELECT SUM(wins), SUM(podiums), SUM(poles)
            FROM driver_season_stats ds
            JOIN drivers d ON ds.driver_id = d.driver_id
            WHERE d.first_name = ? AND d.last_name = ?
        """, (first, last)).fetchone()
        
        if not row or row[0] is None:
            results.fail(f"Stats: {driver_name}", "Not found in driver_season_stats")
            continue
        
        wins, podiums, poles = row
        issues = []
        if wins < ref["wins_min"]:
            issues.append(f"wins {wins} < {ref['wins_min']}")
        if podiums < ref["podiums_min"]:
            issues.append(f"podiums {podiums} < {ref['podiums_min']}")
        if poles < ref["poles_min"]:
            issues.append(f"poles {poles} < {ref['poles_min']}")
        
        if issues:
            results.fail(f"Stats: {driver_name}", "; ".join(issues))
        else:
            results.ok(f"Stats: {driver_name}", f"W={wins}, P3={podiums}, PP={poles}")


# ── Qualifying / Poles Tests ──────────────────────────────────────────────────

@test("Poles: Qualifying data linked correctly")
def test_qualifying_linkage(conn):
    # All qualifying records should link to valid races
    orphans = conn.execute("""
        SELECT count(*) FROM qualifying q
        LEFT JOIN races r ON q.race_id = r.race_id
        WHERE r.race_id IS NULL
    """).fetchone()[0]
    if orphans > 0:
        results.fail("Poles: orphan qualifying", f"{orphans} without race")
    else:
        results.ok("Poles: orphan qualifying")

    # Verify poles can be reached via front-end JOIN path
    poles_direct = conn.execute("SELECT count(*) FROM qualifying WHERE position = 1").fetchone()[0]
    poles_joined = conn.execute("""
        SELECT count(*) FROM race_results rr
        LEFT JOIN qualifying q ON rr.race_id = q.race_id AND rr.driver_id = q.driver_id
        WHERE q.position = 1
    """).fetchone()[0]
    
    diff = abs(poles_direct - poles_joined)
    if diff > 20:
        results.fail("Poles: JOIN path", f"Direct={poles_direct}, Joined={poles_joined}, diff={diff}")
    else:
        results.ok("Poles: JOIN path", f"Direct={poles_direct}, Joined={poles_joined}")


# ── Coverage Tests ────────────────────────────────────────────────────────────

@test("Coverage: Driver photos percentage")
def test_photo_coverage(conn):
    total = conn.execute("SELECT count(*) FROM drivers").fetchone()[0]
    with_photo = conn.execute("SELECT count(*) FROM driver_photos").fetchone()[0]
    pct = with_photo * 100 // total
    
    if pct < 85:
        results.fail("Coverage: driver photos", f"{with_photo}/{total} ({pct}%)")
    elif pct < 95:
        results.warn("Coverage: driver photos", f"{with_photo}/{total} ({pct}%)")
    else:
        results.ok("Coverage: driver photos", f"{with_photo}/{total} ({pct}%)")


@test("Coverage: Chinese names")
def test_chinese_names(conn):
    total = conn.execute("SELECT count(*) FROM drivers").fetchone()[0]
    with_cn = conn.execute(
        "SELECT count(*) FROM drivers WHERE last_name_cn IS NOT NULL AND last_name_cn != ''").fetchone()[0]
    pct = with_cn * 100 // total
    
    # Chinese names are partial coverage by design, just track it
    if with_cn < 30:
        results.warn("Coverage: Chinese names", f"{with_cn}/{total} ({pct}%)")
    else:
        results.ok("Coverage: Chinese names", f"{with_cn}/{total} ({pct}%)")


# ── Cross-Table Consistency Tests ─────────────────────────────────────────────

@test("Consistency: Season stats covers all active seasons")
def test_stats_cover_seasons(conn):
    # Every season in races should have corresponding driver_season_stats
    missing = conn.execute("""
        SELECT DISTINCT r.season FROM races r
        WHERE r.season NOT IN (SELECT DISTINCT season FROM driver_season_stats)
    """).fetchall()
    if missing:
        results.fail("Consistency: stats vs seasons", f"Missing stats for: {[r[0] for r in missing]}")
    else:
        results.ok("Consistency: stats vs seasons")


@test("Consistency: Championships cover all seasons")
def test_champs_cover_seasons(conn):
    missing = conn.execute("""
        SELECT DISTINCT r.season FROM races r
        WHERE r.season NOT IN (SELECT DISTINCT season FROM driver_championships)
    """).fetchall()
    if missing:
        results.fail("Consistency: champs vs seasons", f"Missing: {[r[0] for r in missing]}")
    else:
        results.ok("Consistency: champs vs seasons")


@test("Consistency: Every season has exactly one rank=1 champion")
def test_unique_champion_per_season(conn):
    dupes = conn.execute("""
        SELECT season, count(*) as cnt FROM driver_championships
        WHERE rank = 1
        GROUP BY season
        HAVING cnt != 1
    """).fetchall()
    if dupes:
        results.fail("Consistency: unique champion", f"Seasons with != 1 champion: {dupes}")
    else:
        results.ok("Consistency: unique champion")


# ── Sprint Race Tests ─────────────────────────────────────────────────────────

@test("Sprint: Data exists for 2021+")
def test_sprint_data(conn):
    count = conn.execute("SELECT count(*) FROM sprint_results").fetchone()[0]
    if count < 100:
        results.warn("Sprint: results count", f"Only {count} sprint results")
    else:
        results.ok("Sprint: results count", str(count))

    seasons = conn.execute("SELECT DISTINCT season FROM sprint_races ORDER BY season").fetchall()
    season_list = [r[0] for r in seasons]
    if 2021 not in season_list:
        results.fail("Sprint: 2021 season", "No sprint data for 2021")
    else:
        results.ok("Sprint: seasons covered", str(season_list))


# ── Test Runner ───────────────────────────────────────────────────────────────

def run_all_tests():
    start = time.time()
    
    print("=" * 60)
    print("  F1 Data Pipeline - Integrity Test Suite")
    print("=" * 60)
    
    if not os.path.exists(DB_PATH):
        print(f"\nERROR: Database not found at {DB_PATH}")
        sys.exit(1)
    
    conn = sqlite3.connect(DB_PATH)
    print(f"\nDatabase: {os.path.abspath(DB_PATH)}")
    
    # Collect all test functions
    tests = [obj for obj in globals().values()
             if callable(obj) and hasattr(obj, '_test_name')]
    
    if QUICK:
        # Quick mode: only schema + volume + key stats
        quick_names = {"Schema", "Volume", "Stats"}
        tests = [t for t in tests if any(t._test_name.startswith(n) for n in quick_names)]
    
    print(f"Running {len(tests)} test groups...\n")
    
    for test_func in tests:
        if VERBOSE:
            print(f"  >> {test_func._test_name}")
        try:
            test_func(conn)
        except Exception as e:
            results.fail(test_func._test_name, f"Exception: {e}")
    
    conn.close()
    elapsed = time.time() - start
    
    # Print results
    print("\n" + "=" * 60)
    print("  Test Results")
    print("=" * 60)
    
    for status, name, msg in results.details:
        if status == "PASS":
            icon = "  PASS"
            if not VERBOSE:
                continue  # Only show failures/warnings in non-verbose mode
        elif status == "FAIL":
            icon = "  FAIL"
        else:
            icon = "  WARN"
        
        line = f"  {icon}  {name}"
        if msg:
            line += f"  ({msg})"
        print(line)
    
    print("\n" + "-" * 60)
    print(f"  {results.summary()}")
    print(f"  Elapsed: {elapsed:.1f}s")
    print("=" * 60)
    
    if results.failed > 0:
        print(f"\n  RESULT: FAILED ({results.failed} failures)")
        sys.exit(1)
    else:
        print(f"\n  RESULT: ALL PASSED")
        sys.exit(0)


if __name__ == "__main__":
    run_all_tests()
