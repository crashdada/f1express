import datetime
import pytest
from collector.scraper_results import find_recent_race

def test_find_recent_race_within_window():
    # Setup a race that ended 10 hours ago (within 3 hour to 3 day window)
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    # Race started 15 hours ago, ended 10 hours ago (assuming 5h post-start is end marker)
    race_start = now_utc - datetime.timedelta(hours=15)
    
    schedule = [{
        "round": "Round 1",
        "slug": "australia",
        "sessions": [
            {"name": "RACE", "time": race_start.strftime('%Y-%m-%dT%H:%M:%SZ')}
        ]
    }]
    
    race = find_recent_race(schedule, 2026)
    assert race is not None
    assert race['slug'] == 'australia'

def test_find_recent_race_too_early():
    # Race just started 1 hour ago (not yet ended + 3h grace)
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    race_start = now_utc - datetime.timedelta(hours=1)
    
    schedule = [{
        "round": "Round 1",
        "slug": "australia",
        "sessions": [
            {"name": "RACE", "time": race_start.strftime('%Y-%m-%dT%H:%M:%SZ')}
        ]
    }]
    
    race = find_recent_race(schedule, 2026)
    assert race is None

def test_find_recent_race_too_late():
    # Race ended 10 days ago
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    race_start = now_utc - datetime.timedelta(days=10)
    
    schedule = [{
        "round": "Round 1",
        "slug": "australia",
        "sessions": [
            {"name": "RACE", "time": race_start.strftime('%Y-%m-%dT%H:%M:%SZ')}
        ]
    }]
    
    race = find_recent_race(schedule, 2026)
    assert race is None
