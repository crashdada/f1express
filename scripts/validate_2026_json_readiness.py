#!/usr/bin/env python3
from __future__ import annotations

import io
import json
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")


REQUIRED_RACE_FIELDS = ("pos", "number", "firstName", "lastName", "code", "team", "points", "status", "laps", "time")
REQUIRED_SPRINT_FIELDS = ("pos", "number", "firstName", "lastName", "code", "team", "points", "status", "laps", "time")
REQUIRED_QUALI_FIELDS = ("position", "number", "firstName", "lastName", "code", "time", "q1", "q2", "q3")


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def check_fields(items, required_fields, label):
    issues = []
    for idx, item in enumerate(items, start=1):
        missing = [field for field in required_fields if field not in item]
        if missing:
            issues.append(f"{label} #{idx} missing fields: {', '.join(missing)}")
    return issues


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    results_path = root / "storage" / "results_2026.json"
    schedule_path = root / "storage" / "schedule_2026.json"

    results = load_json(results_path)
    schedule = load_json(schedule_path)

    issues = []
    schedule_rounds = {int(item["roundNumber"]) for item in schedule if item.get("roundNumber")}
    result_rounds = {int(item["round"]) for item in results if item.get("round")}

    missing_schedule_rounds = sorted(result_rounds - schedule_rounds)
    if missing_schedule_rounds:
        issues.append(f"rounds missing from schedule_2026.json: {missing_schedule_rounds}")

    for race in results:
        round_number = race.get("round")
        race_label = f"R{round_number} {race.get('slug', '')}".strip()

        if not race.get("eventId"):
            issues.append(f"{race_label} missing eventId")

        issues.extend(check_fields(race.get("results", []), REQUIRED_RACE_FIELDS, f"{race_label} race result"))

        sprint_results = race.get("sprintResults", [])
        if sprint_results:
            if len(sprint_results) > 8:
                issues.append(f"{race_label} sprintResults has {len(sprint_results)} rows, expected <= 8")
            issues.extend(check_fields(sprint_results, REQUIRED_SPRINT_FIELDS, f"{race_label} sprint result"))

        qualifying_results = race.get("qualifyingResults", [])
        if qualifying_results:
            if len(qualifying_results) != 3:
                issues.append(f"{race_label} qualifyingResults has {len(qualifying_results)} rows, expected 3")
            issues.extend(check_fields(qualifying_results, REQUIRED_QUALI_FIELDS, f"{race_label} qualifying result"))

        if race.get("polePosition") and not qualifying_results:
            issues.append(f"{race_label} has polePosition but missing qualifyingResults")

    print("=== 2026 JSON Readiness Check ===")
    print(f"results file: {results_path}")
    print(f"schedule file: {schedule_path}")
    print(f"race count: {len(results)}")

    if issues:
        print(f"issues found: {len(issues)}")
        for issue in issues[:50]:
            print(f"- {issue}")
        if len(issues) > 50:
            print(f"... {len(issues) - 50} more")
        return 1

    print("all checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
