#!/usr/bin/env python3
"""
Stage-based orchestrator for the local/NAS F1 data pipeline.

The historical "13 steps" are still represented here, but grouped into
clearer phases:
1. Prepare inputs
2. Build normalized database
3. Enrich database and assets
4. Derive standings and aggregates
5. Publish runtime artifacts
6. Validate outputs

Constructor / historical points notes:
- 正式库必须由这条完整流水线重建，不能只依赖旧库做局部修补。
- race_results.csv 中的历史半分、修正后的原始积分，只有在 create_normalized_db.py
  全量重建后才会进入正式库；旧库直接沿用会保留陈旧值。
- sprint_results.csv 的车队积分不是从 race_results.csv 推导出来的补丁，而是独立导入：
  需要 import_sprint_data.py 在导入时补齐 race_id / round_number / team_id，
  后续 recalculate_stats.py 才能把 2021+ 冲刺积分正确并入车队积分。
- constructors_full.csv 是验证表，不是正式展示源；对账时必须优先取 outof，再回退 points。
"""
from __future__ import annotations

import argparse
import hashlib
import io
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

sys.path.append(str(Path(__file__).resolve().parent))
from f1_config import ensure_dirs, get_path


NAS_MODE = os.environ.get("NAS_MODE", "").lower() in {"1", "true", "yes"}
MAX_BACKUPS = 5


@dataclass
class StepResult:
    phase: str
    label: str
    success: bool | None
    elapsed: float


STEP_RESULTS: list[StepResult] = []


def safe_print(message: str = "", **kwargs) -> None:
    try:
        print(message, **kwargs)
    except UnicodeEncodeError:
        print(message.encode("ascii", "replace").decode("ascii"), **kwargs)


def record(phase: str, label: str, success: bool | None, elapsed: float) -> None:
    STEP_RESULTS.append(StepResult(phase=phase, label=label, success=success, elapsed=elapsed))


def run_command(command: list[str], cwd: Path, *, extra_env: dict[str, str] | None = None) -> tuple[bool, float]:
    safe_print(f"\n>>> Running: {' '.join(command)}")
    env = os.environ.copy()
    env["PYTHONIOENCODING"] = "utf-8"
    if extra_env:
        env.update(extra_env)

    started = time.time()
    try:
        process = subprocess.Popen(
            command,
            cwd=str(cwd),
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,
            universal_newlines=True,
        )
        assert process.stdout is not None
        for line in process.stdout:
            safe_print(line, end="")
        process.wait()
        ok = process.returncode == 0
        if not ok:
            safe_print(f"[ERROR] Command exited with status {process.returncode}")
        return ok, time.time() - started
    except Exception as exc:
        safe_print(f"[ERROR] Unexpected failure: {exc}")
        return False, time.time() - started


def backup_existing_database(db_path: Path) -> bool | None:
    if not db_path.exists():
        safe_print("  [SKIP] No existing database found; skipping backup.")
        return None

    backup_dir = get_path("backups")
    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backup_dir / f"f1_backup_{timestamp}.db"
    shutil.copy2(db_path, backup_path)
    safe_print(f"  [OK] Database backup created: {backup_path.name}")

    backups = sorted(path for path in backup_dir.glob("f1_backup_*.db"))
    while len(backups) > MAX_BACKUPS:
        backups[0].unlink(missing_ok=True)
        backups.pop(0)

    return True


def hot_update_nas() -> None:
    source_root = get_path("root")
    target_dir = Path(os.environ.get("F1_NAS_DIST_DATA", "")) if os.environ.get("F1_NAS_DIST_DATA") else None
    if target_dir is None or not str(target_dir):
        target_dir = Path(__file__).resolve().parents[1] / "dist" / "data"

    target_dir.mkdir(parents=True, exist_ok=True)
    copied = 0
    for item in source_root.iterdir():
        if item.is_file() and (item.suffix == ".db" or item.suffix == ".json"):
            shutil.copy2(item, target_dir / item.name)
            copied += 1
    safe_print(f"  [OK] Copied {copied} runtime files into {target_dir}")


def get_csv_directory_hash(csv_dir: Path) -> str:
    digest = hashlib.md5()
    for csv_path in sorted(csv_dir.glob("*.csv")):
        with csv_path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(4096), b""):
                digest.update(chunk)
    return digest.hexdigest()


def should_use_light_mode(csv_dir: Path, hash_file: Path, db_path: Path, force_rebuild: bool) -> bool:
    if force_rebuild or not db_path.exists():
        return False

    current_hash = get_csv_directory_hash(csv_dir)
    previous_hash = hash_file.read_text(encoding="utf-8").strip() if hash_file.exists() else ""
    if current_hash == previous_hash:
        return True

    hash_file.write_text(current_hash, encoding="utf-8")
    return False


def persist_csv_hash(csv_dir: Path, hash_file: Path) -> None:
    hash_file.write_text(get_csv_directory_hash(csv_dir), encoding="utf-8")


def print_phase_header(title: str) -> None:
    safe_print(f"\n{'=' * 72}\n{title}\n{'=' * 72}")


def print_summary(light_mode: bool) -> bool:
    mode = "LIGHT" if light_mode else "FULL"
    safe_print(f"\n{'=' * 72}\nPipeline Summary ({mode} mode)\n{'=' * 72}")

    all_ok = True
    current_phase = None
    for index, result in enumerate(STEP_RESULTS, start=1):
        if result.phase != current_phase:
            current_phase = result.phase
            safe_print(f"\n[{current_phase}]")

        if result.success is True:
            icon = "OK"
        elif result.success is False:
            icon = "FAIL"
            all_ok = False
        else:
            icon = "SKIP"

        safe_print(f"  {index:02d}. {icon:<4} {result.label:<42} {result.elapsed:>6.1f}s")

    total_elapsed = sum(item.elapsed for item in STEP_RESULTS)
    safe_print(f"\nTotal elapsed: {total_elapsed:.1f}s")
    safe_print(f"Overall status: {'SUCCESS' if all_ok else 'FAILED'}")
    safe_print(f"{'=' * 72}")
    return all_ok


def main() -> int:
    parser = argparse.ArgumentParser(description="Run the staged F1 data pipeline.")
    parser.add_argument("-f", "--force", action="store_true", help="Force a full rebuild even if CSV hashes did not change.")
    parser.add_argument("--skip-backup", action="store_true", help="Skip backing up the existing database before a full rebuild.")
    parser.add_argument(
        "--skip-integrity",
        action="store_true",
        help="Skip the final integrity test suite.",
    )
    parser.add_argument(
        "--validate-constructors",
        action="store_true",
        help="Run constructors_full.csv comparison as a final check-only report.",
    )
    args = parser.parse_args()

    total_started = time.time()
    script_dir = Path(__file__).resolve().parent
    repo_root = script_dir.parent
    pipeline_dir = script_dir / "pipeline"
    collector_dir = repo_root / "collector"
    csv_dir = get_path("csv")
    db_path = get_path("db")
    hash_file = script_dir / ".csv_hash"

    ensure_dirs()
    light_mode = should_use_light_mode(csv_dir, hash_file, db_path, args.force)
    if not light_mode:
        persist_csv_hash(csv_dir, hash_file)

    print_phase_header("F1 Data Pipeline")
    safe_print(f"Mode: {'Light refresh' if light_mode else 'Full rebuild'}")
    safe_print(f"Storage root: {get_path('root')}")
    safe_print(f"Database: {db_path}")
    safe_print(f"NAS mode: {'enabled' if NAS_MODE else 'disabled'}")

    # Phase 1: Prepare inputs
    phase = "Phase 1: Prepare"
    print_phase_header(phase)
    if light_mode:
        record(phase, "Cloud asset sync", None, 0.0)
        record(phase, "Database backup", None, 0.0)
    else:
        record(phase, "Cloud asset sync", None, 0.0)

        if args.skip_backup:
            record(phase, "Database backup", None, 0.0)
        else:
            started = time.time()
            ok = backup_existing_database(db_path)
            record(phase, "Database backup", ok, time.time() - started)

    # Phase 2: Build normalized database
    phase = "Phase 2: Build"
    print_phase_header(phase)
    if light_mode:
        record(phase, "Normalized database build", None, 0.0)
    else:
        ok, elapsed = run_command([sys.executable, str(pipeline_dir / "create_normalized_db.py")], cwd=repo_root)
        record(phase, "Normalized database build", ok, elapsed)

    # Phase 3: Enrich database and assets
    phase = "Phase 3: Enrich"
    print_phase_header(phase)
    enrichment_scripts = [
        ("Historical photo patch", "patch_historical_photos.py"),
        ("Driver Chinese names", "add_driver_chinese_names.py"),
        ("Sprint data import", "import_sprint_data.py"),
        ("Fastest lap import", "import_fastest_lap.py"),
        ("Special events application", "apply_special_events.py"),
    ]
    for label, filename in enrichment_scripts:
        if light_mode:
            record(phase, label, None, 0.0)
            continue
        ok, elapsed = run_command([sys.executable, str(pipeline_dir / filename)], cwd=repo_root)
        record(phase, label, ok, elapsed)

    # Phase 4: Derive standings and aggregates
    phase = "Phase 4: Derive"
    print_phase_header(phase)
    derive_steps = [
        ("Championship recalculation", ["node", str(pipeline_dir / "recalculate_championships.cjs")]),
        ("Season stats recalculation", [sys.executable, str(pipeline_dir / "recalculate_stats.py")]),
        ("Photo index generation", [sys.executable, str(pipeline_dir / "update_photo_index.py")]),
    ]
    for label, command in derive_steps:
        ok, elapsed = run_command(command, cwd=repo_root, extra_env={"F1_DB_PATH": str(db_path)})
        record(phase, label, ok, elapsed)

    # Phase 5: Publish runtime artifacts
    phase = "Phase 5: Publish"
    print_phase_header(phase)
    started = time.time()
    refine_script = collector_dir / "processors" / "refine_with_stats.py"
    syncer_script = collector_dir / "syncer.py"

    if refine_script.exists():
        ok, elapsed = run_command([sys.executable, str(refine_script)], cwd=repo_root, extra_env={"F1_DB_PATH": str(db_path)})
        record(phase, "Collector stat refinement", ok, elapsed)
    else:
        record(phase, "Collector stat refinement", None, 0.0)

    if NAS_MODE:
        hot_update_nas()
        record(phase, "NAS hot update", True, time.time() - started)
    else:
        if syncer_script.exists():
            ok, elapsed = run_command([sys.executable, str(syncer_script)], cwd=collector_dir)
            record(phase, "Collector sync", ok, elapsed)
        else:
            record(phase, "Collector sync", None, 0.0)

    # Phase 6: Validate outputs
    phase = "Phase 6: Validate"
    print_phase_header(phase)
    integrity_script = script_dir / "tests" / "test_data_integrity.py"
    if args.skip_integrity:
        record(phase, "Integrity test suite", None, 0.0)
    elif integrity_script.exists():
        ok, elapsed = run_command([sys.executable, str(integrity_script)], cwd=repo_root)
        record(phase, "Integrity test suite", ok, elapsed)
    else:
        record(phase, "Integrity test suite", None, 0.0)

    if args.validate_constructors:
        ok, elapsed = run_command([sys.executable, str(pipeline_dir / "validate_constructor_totals.py")], cwd=repo_root)
        record(phase, "Constructor totals validation", ok, elapsed)
    else:
        record(phase, "Constructor totals validation", None, 0.0)

    all_ok = print_summary(light_mode)
    safe_print(f"\n[DONE] {'SUCCESS' if all_ok else 'FAILED'} in {time.time() - total_started:.1f}s")
    return 0 if all_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
