# Collector Tools Index

`collector/tools/` now groups ad-hoc utilities by purpose so we can keep the
directory navigable without changing the main collector pipeline structure.

## Layout

- `debug/`: generic debugging, validation, tracing, and search helpers
- `inspect/`: structure inspection, dumps, and content peeking helpers
- `oneoff/`: topic-specific investigations and small one-time maintenance scripts
- `_shared.py`: shared path resolution for nested tool scripts

## How To Run

Run tools from the project root so relative imports and output paths stay
predictable:

```bash
python collector/tools/debug/check_rounds.py
python collector/tools/inspect/inspect_html.py
python collector/tools/oneoff/patch_tracks.py
```

These tools are not part of CI and most are intended for manual debugging.

## Debug

- `analyze_keys.py`
- `check_102901.py`
- `check_all_races.py`
- `check_context.py`
- `check_keys.py`
- `check_link_in_push.py`
- `check_locations.py`
- `check_missing.py`
- `check_rounds.py`
- `check_slugs.py`
- `check_tag.py`
- `check_times.py`
- `check_times_v2.py`
- `count_meetings.py`
- `debug_results_rows.py`
- `debug_rounds_v2.py`
- `debug_sessions.py`
- `efficient_search.py`
- `find_all_meetings.py`
- `find_large_arrays.py`
- `find_meeting_keys.py`
- `find_meetings_v2.py`
- `find_round_objects.py`
- `find_rounds.py`
- `regex_rounds.py`
- `search_ids.py`
- `search_schedule.py`
- `test_detail_sessions.py`
- `test_fallbacks.py`
- `test_full_scrape.py`
- `test_race_sessions.py`
- `test_row.py`
- `test_urls.py`
- `trace_link_tags.py`
- `trace_rounds.py`
- `trace_tags.py`
- `validate_24_slugs.py`

## Inspect

- `debug_json.py`
- `dump_all_next.py`
- `dump_children.py`
- `dump_next_data.py`
- `examine_card.py`
- `examine_chunks.py`
- `extract_meetings.py`
- `inspect_card.py`
- `inspect_html.py`
- `inspect_push.py`
- `peek_card.py`
- `print_schema.py`

## Oneoff

- `analyze_australia.py`
- `calc_mclaren.py`
- `check_abu_dhabi.py`
- `check_abu_dhabi_context.py`
- `check_britain.py`
- `check_cities.py`
- `check_cities_v2.py`
- `check_db.py`
- `check_fractions_simple.py`
- `check_half.py`
- `check_mid_season.py`
- `check_monaco.py`
- `check_monaco_v2.py`
- `check_results_context.py`
- `check_results_data.py`
- `check_round5_context.py`
- `debug_mclaren.py`
- `debug_points.py`
- `extract_metadata.py`
- `find_all_australia.py`
- `find_fractions.py`
- `mclaren_final.py`
- `mclaren_yearly.py`
- `patch_tracks.py`
- `scrape_links.py`
- `sum_all.py`
- `sum_tss.py`
- `trace_saudi.py`
