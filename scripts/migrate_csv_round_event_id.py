#!/usr/bin/env python3
from __future__ import annotations

import csv
import shutil
from pathlib import Path


CSV_DIR = Path(__file__).resolve().parents[1] / "storage" / "csv"


def read_csv(path: Path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)
        return reader.fieldnames or [], rows


def write_csv(path: Path, fieldnames, rows):
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def build_round_mapping(meta_rows):
    per_year_events: dict[int, list[int]] = {}
    for row in meta_rows:
        year = int(row["year"])
        event_id = int(row["round"])
        per_year_events.setdefault(year, []).append(event_id)

    mapping: dict[tuple[int, int], int] = {}
    for year, event_ids in per_year_events.items():
        for round_number, event_id in enumerate(sorted(set(event_ids)), start=1):
            mapping[(year, event_id)] = round_number
    return mapping


def migrate_rows(rows, mapping):
    migrated = []
    for row in rows:
        year = int(row["year"])
        event_id = int(row["round"])
        round_number = mapping[(year, event_id)]
        new_row = dict(row)
        new_row["event_id"] = str(event_id)
        new_row["round"] = str(round_number)
        migrated.append(new_row)
    return migrated


def ensure_backup(path: Path):
    backup_path = path.with_suffix(path.suffix + ".bak")
    if not backup_path.exists():
        shutil.copy2(path, backup_path)
    return backup_path


def insert_after(fieldnames, after_field, new_field):
    result = []
    inserted = False
    for field in fieldnames:
        result.append(field)
        if field == after_field:
            result.append(new_field)
            inserted = True
    if not inserted:
        raise ValueError(f"Cannot insert {new_field}: missing anchor field {after_field}")
    return result


def main() -> int:
    files = {
        "race_results": CSV_DIR / "race_results.csv",
        "races_meta": CSV_DIR / "races_meta.csv",
        "qualifying_results": CSV_DIR / "qualifying_results.csv",
    }

    meta_fields, meta_rows = read_csv(files["races_meta"])
    mapping = build_round_mapping(meta_rows)

    for key, path in files.items():
        ensure_backup(path)
        fieldnames, rows = read_csv(path)
        if "event_id" in fieldnames:
            print(f"[SKIP] {path.name} already has event_id")
            continue

        migrated_rows = migrate_rows(rows, mapping)
        migrated_fields = insert_after(fieldnames, "round", "event_id")
        write_csv(path, migrated_fields, migrated_rows)
        print(f"[OK] migrated {path.name}: {len(migrated_rows)} rows")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
