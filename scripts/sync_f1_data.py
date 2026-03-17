import subprocess
import os
import sys
import shutil
import time
from datetime import datetime
import hashlib
import json
from pathlib import Path
import io

# Fix encoding for Windows
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

# Import central config
sys.path.append(str(Path(__file__).resolve().parent))
from f1_config import get_path, ensure_dirs, STORAGE_ROOT

# ── 环境检测 ──────────────────────────────────────────────────────────────────
# NAS 模式：通过环境变量 NAS_MODE=true 激活（在 compose.yaml 中设置）
NAS_MODE = os.environ.get('NAS_MODE', '').lower() in ('1', 'true', 'yes')

# 备份最大保留数量
MAX_BACKUPS = 5

# ── 步骤结果追踪 ───────────────────────────────────────────────────────────────
step_results = []   # [(step_label, success: bool/None, elapsed_s: float)]
# success: True=✅, False=❌, None=⏩ (Skipped)

def safe_print(msg, **kwargs):
    try:
        print(msg, **kwargs)
    except UnicodeEncodeError:
        if isinstance(msg, str):
            print(msg.encode('ascii', 'replace').decode('ascii'), **kwargs)
        else:
            print(msg, **kwargs)

def record(label, success, elapsed):
    step_results.append((label, success, elapsed))

def run_command(command, cwd=None, extra_env=None):
    safe_print(f"\n>>> 正在运行: {' '.join(str(c) for c in command)}")
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    
    env['PYTHONIOENCODING'] = 'utf-8'
    
    t0 = time.time()
    try:
        process = subprocess.Popen(
            command,
            cwd=cwd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            encoding='utf-8',
            errors='replace',
            bufsize=1,
            universal_newlines=True
        )
        
        for line in process.stdout:
            safe_print(line, end='', flush=True)
            
        process.wait()
        
        if process.returncode != 0:
            safe_print(f"!!! 错误: Command returned non-zero exit status {process.returncode}")
            return False, time.time() - t0
        return True, time.time() - t0
    except Exception as e:
        safe_print(f"!!! 非预期异常: {e}")
        return False, time.time() - t0

def backup_database(db_path, website_dir):
    if not os.path.exists(db_path):
        safe_print("  [SKIP] 数据库不存在，跳过备份")
        return False

    backup_dir = str(get_path('backups'))
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(backup_dir, f'f1_backup_{timestamp}.db')
    shutil.copy2(db_path, backup_path)
    print(f"  [OK] 已备份至: {os.path.basename(backup_path)}")
    
    backups = sorted([f for f in os.listdir(backup_dir) if f.startswith('f1_backup_') and f.endswith('.db')])
    while len(backups) > MAX_BACKUPS:
        os.remove(os.path.join(backup_dir, backups.pop(0)))
    return True

def hot_update_nas(website_dir):
    # In separated mode, this might still be needed if DIST is independent,
    # but usually, we serve directly from storage.
    src_dir = get_path('root')
    dst_dir = os.path.join(website_dir, "dist", "data")
    os.makedirs(dst_dir, exist_ok=True)
    count = 0
    for fname in os.listdir(src_dir):
        if fname.endswith('.db') or (os.path.isfile(os.path.join(src_dir, fname)) and fname.endswith('.json')):
            shutil.copy2(os.path.join(src_dir, fname), os.path.join(dst_dir, fname))
            count += 1
    
    # Also copy live data
    live_dir = get_path('live')
    if os.path.exists(live_dir):
        for fname in os.listdir(live_dir):
            if fname.endswith('.json'):
                shutil.copy2(os.path.join(live_dir, fname), os.path.join(dst_dir, fname))
                count += 1
    print(f"  [OK] 热更新完成：共同步 {count} 个文件至 dist/data/")

def get_directory_hash(directory):
    """计算目录下所有 CSV 文件的 MD5 综合哈希"""
    hash_md5 = hashlib.md5()
    files = sorted([f for f in os.listdir(directory) if f.endswith('.csv')])
    for filename in files:
        filepath = os.path.join(directory, filename)
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
    return hash_md5.hexdigest()

def print_summary(is_light):
    mode_str = "LIGHT (Asset Only)" if is_light else "FULL (Database Rebuild)"
    safe_print("\n" + "=" * 60)
    safe_print(f"📋 执行汇总 ({mode_str} Mode)")
    safe_print("=" * 60)
    all_ok = True
    for i, (label, status, elapsed) in enumerate(step_results, 1):
        if status is True:
            icon = "✅"
        elif status is False:
            icon = "❌"
            all_ok = False
        else:
            icon = "⏩" # Skipped
        
        safe_print(f"  {i:2d}. {icon}  {label:<45} {elapsed:>5.1f}s")
    
    total = sum(e for _, _, e in step_results)
    safe_print("-" * 60)
    status_label = "全部成功 ✅" if all_ok else "存在失败步骤 ❌"
    safe_print(f"  总耗时: {total:.1f}s | 状态: {status_label}")
    safe_print("=" * 60)
    return all_ok

def main():
    total_start = time.time()
    SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
    WEBSITE_DIR   = os.path.dirname(SCRIPT_DIR)
    COLLECTOR_DIR = os.path.join(WEBSITE_DIR, "collector")
    COLLECTOR_SCRIPTS_DIR = os.path.join(WEBSITE_DIR, "collector")
    CSV_DIR       = str(get_path('csv'))
    HASH_FILE     = os.path.join(SCRIPT_DIR, ".csv_hash")
    db_path       = str(get_path('db'))
    ensure_dirs()

    # 命令行参数
    force_rebuild = "--force" in sys.argv or "-f" in sys.argv

    # 检测 CSV 变更
    current_hash = get_directory_hash(CSV_DIR)
    old_hash = ""
    if os.path.exists(HASH_FILE):
        with open(HASH_FILE, "r") as f:
            old_hash = f.read().strip()
    
    # 决定模式
    is_light = False
    if old_hash == current_hash and os.path.exists(db_path) and not force_rebuild:
        is_light = True
    else:
        # 记录新哈希
        with open(HASH_FILE, "w") as f:
            f.write(current_hash)

    print("=" * 60)
    if is_light:
        print("🚀 检测到 CSV 环境未变且数据库存在，进入【轻量同步模式】")
        print("   (将跳过历史数据重建，保护 Scraper 已采集数据)")
    else:
        print("🔄 检测到 CSV 变更或强制刷新，进入【全量重建模式】")
    print("=" * 60)

    # 1. 规范化数据库重建
    PIPELINE_DIR = os.path.join(SCRIPT_DIR, "pipeline")
    if not is_light:
        print("\n[步骤 1/12] 规范化数据库重构 (CSV -> f1.db)...")
        db_build_script = os.path.join(PIPELINE_DIR, "create_normalized_db.py")
        ok, elapsed = run_command([sys.executable, db_build_script], cwd=WEBSITE_DIR)
        record("数据库重建 (Normalized DB Build)", ok, elapsed)
    else:
        record("数据库重建 (Skipped - Light Mode)", None, 0)

    # 2. 资产下载 (仅全量模式)
    if not is_light:
        print("\n[步骤 2/12] 云端资源局部化同步...")
        asset_script = os.path.join(PIPELINE_DIR, "download_csv_assets.py")
        ok, elapsed = run_command([sys.executable, asset_script], cwd=WEBSITE_DIR)
        record("云端资源局部化 (Cloud Asset Sync)", ok, elapsed)
    else:
        record("云端资源局部化 (Skipped)", None, 0)

    # 3. 数据备份 (仅全量模式)
    if not is_light:
        print("\n[步骤 3/12] 数据库快照备份...")
        ok = backup_database(db_path, WEBSITE_DIR)
        record("数据库备份 (DB Backup)", ok, 0.1)
    else:
        record("数据库备份 (Skipped)", None, 0)

    # 4. 历史照片
    if not is_light:
        print("\n[步骤 4/12] 历史驱动照片索引补全 (Archive)...")
        patch_photo_script = os.path.join(PIPELINE_DIR, "patch_historical_photos.py")
        ok, elapsed = run_command([sys.executable, patch_photo_script], cwd=WEBSITE_DIR)
        record("历史照片补全 (History Photo Arch)", ok, elapsed)
    else:
        record("历史照片补全 (Skipped)", None, 0)

    # 5. 中文名称
    if not is_light:
        print("\n[步骤 5/12] 中文化翻译引擎...")
        chinese_name_script = os.path.join(PIPELINE_DIR, "add_driver_chinese_names.py")
        ok, elapsed = run_command([sys.executable, chinese_name_script], cwd=WEBSITE_DIR)
        record("中文化翻译 (Multilingual Support)", ok, elapsed)
    else:
        record("中文化翻译 (Skipped)", None, 0)

    # 6. 冲刺赛导入
    if not is_light:
        print("\n[步骤 6/12] 冲刺赛数据集成...")
        sprint_script = os.path.join(PIPELINE_DIR, "import_sprint_data.py")
        ok, elapsed = run_command([sys.executable, sprint_script], cwd=WEBSITE_DIR)
        record("冲刺赛集成 (Sprint Integration)", ok, elapsed)
    else:
        record("冲刺赛集成 (Skipped)", None, 0)

    # 7. 历史最快圈导入
    if not is_light:
        print("\n[步骤 7/12] 最快圈速库注入...")
        fl_script = os.path.join(PIPELINE_DIR, "import_fastest_lap.py")
        ok, elapsed = run_command([sys.executable, fl_script], cwd=WEBSITE_DIR)
        record("最快圈速注入 (Fastest Lap Repo)", ok, elapsed)
    else:
        record("最快圈速注入 (Skipped)", None, 0)

    # 8. 特殊事件处理
    if not is_light:
        print("\n[步骤 8/12] 特殊事件规则应用 (Permanent DB Fixes)...")
        special_events_script = os.path.join(PIPELINE_DIR, "apply_special_events.py")
        ok, elapsed = run_command([sys.executable, special_events_script], cwd=WEBSITE_DIR)
        record("特殊事件应用 (Special Events)", ok, elapsed)
    else:
        # 注意：此处不能热更新，因为现有的 apply_special_events.py 是累加型的
        record("特殊事件应用 (Skipped - Protected History)", None, 0)

    # 9. 冠军重算 (LIGHT 模式必须运行)
    print("\n[步骤 9/12] 年度冠军权威重算...")
    recalc_champ_script = os.path.join(PIPELINE_DIR, "recalculate_championships.cjs")
    ok, elapsed = run_command(["node", recalc_champ_script], cwd=WEBSITE_DIR, extra_env={'F1_DB_PATH': db_path})
    record("冠军重算 (Championship Recalc)", ok, elapsed)

    # 10. 统计全聚合 (LIGHT 模式必须运行)
    print("\n[步骤 10/12] 全量数据统计全聚合...")
    recalc_stats_script = os.path.join(PIPELINE_DIR, "recalculate_stats.py")
    ok, elapsed = run_command([sys.executable, recalc_stats_script], cwd=WEBSITE_DIR, extra_env={'F1_DB_PATH': db_path})
    record("全量统计聚合 (Global Stats Agg)", ok, elapsed)

    # 11. 照片索引更新
    print("\n[步骤 11/12] 视觉资产索引生成...")
    update_photo_script = os.path.join(PIPELINE_DIR, "update_photo_index.py")
    ok, elapsed = run_command([sys.executable, update_photo_script], cwd=WEBSITE_DIR)
    record("照片索引更新 (Photo Index Gen)", ok, elapsed)

    # 12. 最终同步与审计
    print("\n[步骤 12/12] 最终同步与审计...")
    t0 = time.time()
    # 注入 JSON
    if NAS_MODE:
        refine_script = os.path.join(COLLECTOR_SCRIPTS_DIR, "processors", "refine_with_stats.py")
        if os.path.exists(refine_script):
            run_command([sys.executable, refine_script], cwd=WEBSITE_DIR, extra_env={'F1_DB_PATH': db_path})
        hot_update_nas(WEBSITE_DIR)
    else:
        # 本机开发模式
        refine_script_local = os.path.join(COLLECTOR_DIR, "processors", "refine_with_stats.py")
        if os.path.exists(refine_script_local):
            run_command([sys.executable, "processors/refine_with_stats.py"], cwd=COLLECTOR_DIR)
        
        syncer_script_local = os.path.join(COLLECTOR_DIR, "syncer.py")
        if os.path.exists(syncer_script_local):
            run_command([sys.executable, "syncer.py"], cwd=COLLECTOR_DIR)
    
    record("同步 (Sync)", True, time.time() - t0)

    # 13. 数据完整性测试套件
    print("\n[步骤 13] 数据完整性测试...")
    TEST_SCRIPT = os.path.join(SCRIPT_DIR, "tests", "test_data_integrity.py")
    if os.path.exists(TEST_SCRIPT):
        ok, elapsed = run_command([sys.executable, TEST_SCRIPT], cwd=WEBSITE_DIR)
        record("完整性测试 (Integrity Tests)", ok, elapsed)
    else:
        print("  [SKIP] 测试脚本不存在")
        record("完整性测试 (Skipped)", None, 0)

    all_ok = print_summary(is_light)
    status_str = "SUCCESS" if all_ok else "FAILED"
    print(f"\n[DONE] {status_str}: 全流程结束，总耗时 {time.time() - total_start:.1f}s")

if __name__ == "__main__":
    main()
