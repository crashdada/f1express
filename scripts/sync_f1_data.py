import subprocess
import os
import sys
import shutil
import time
from datetime import datetime
import hashlib
import json

# ── 环境检测 ──────────────────────────────────────────────────────────────────
# NAS 模式：通过环境变量 NAS_MODE=true 激活（在 compose.yaml 中设置）
NAS_MODE = os.environ.get('NAS_MODE', '').lower() in ('1', 'true', 'yes')

# 备份最大保留数量
MAX_BACKUPS = 5

# ── 步骤结果追踪 ───────────────────────────────────────────────────────────────
step_results = []   # [(step_label, success: bool/None, elapsed_s: float)]
# success: True=✅, False=❌, None=⏩ (Skipped)

def record(label, success, elapsed):
    step_results.append((label, success, elapsed))

def run_command(command, cwd=None, extra_env=None):
    print(f"\n>>> 正在运行: {' '.join(str(c) for c in command)}")
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    
    env['PYTHONIOENCODING'] = 'utf-8'
    
    t0 = time.time()
    try:
        result = subprocess.run(
            command,
            cwd=cwd,
            check=True,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            env=env
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr)
        return True, time.time() - t0
    except subprocess.CalledProcessError as e:
        print(f"!!! 错误: {e}")
        if e.stdout:
            print(e.stdout)
        if e.stderr:
            print(e.stderr)
        return False, time.time() - t0

def backup_database(db_path, website_dir):
    if not os.path.exists(db_path):
        print("  [SKIP] 数据库不存在，跳过备份")
        return False

    backup_dir = os.path.join(website_dir, 'backups')
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
    src_dir = os.path.join(website_dir, "public", "data")
    dst_dir = os.path.join(website_dir, "dist", "data")
    os.makedirs(dst_dir, exist_ok=True)
    count = 0
    for fname in os.listdir(src_dir):
        if fname.endswith('.db') or fname.endswith('.json'):
            shutil.copy2(os.path.join(src_dir, fname), os.path.join(dst_dir, fname))
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
    print("\n" + "=" * 60)
    mode_str = "LIGHT (Incremental)" if is_light else "FULL (Rebuild)"
    print(f"📋 执行汇总 ({mode_str} Mode)")
    print("=" * 60)
    all_ok = True
    for i, (label, status, elapsed) in enumerate(step_results, 1):
        if status is True:
            icon = "✅"
        elif status is False:
            icon = "❌"
            all_ok = False
        else:
            icon = "⏩" # Skipped
        
        print(f"  {i:2d}. {icon}  {label:<45} {elapsed:>5.1f}s")
    
    total = sum(e for _, _, e in step_results)
    print("-" * 60)
    status_label = "全部成功 ✅" if all_ok else "存在失败步骤 ❌"
    print(f"  总耗时: {total:.1f}s | 状态: {status_label}")
    print("=" * 60)
    return all_ok

def main():
    total_start = time.time()
    SCRIPT_DIR    = os.path.dirname(os.path.abspath(__file__))
    WEBSITE_DIR   = os.path.dirname(SCRIPT_DIR)
    COLLECTOR_DIR = os.path.join(WEBSITE_DIR, "collector")
    COLLECTOR_SCRIPTS_DIR = os.path.join(WEBSITE_DIR, "collector")
    CSV_DIR       = os.path.join(WEBSITE_DIR, "csv")
    HASH_FILE     = os.path.join(SCRIPT_DIR, ".csv_hash")
    db_path       = os.path.join(WEBSITE_DIR, "public", "data", "f1.db")

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

    # 1. 资产本地化
    if not is_light:
        print("\n[步骤 1/12] 资产本地化 (CSV 图片下载)...")
        ok, elapsed = run_command([sys.executable, "scripts/pipeline/download_csv_assets.py"], cwd=WEBSITE_DIR)
        record("资产本地化 (Assets Localization)", ok, elapsed)
    else:
        record("资产本地化 (Skipped - No Change)", None, 0)

    # 2. 数据库备份
    print("\n[步骤 2/12] 安全性备份...")
    t0 = time.time()
    bk = backup_database(db_path, WEBSITE_DIR)
    record("安全性备份 (Security Backup)", bk, time.time() - t0)

    # 3. 重建数据库
    if not is_light:
        print("\n[步骤 3/12] 基础架构重建 (Rebuild Schema)...")
        ok, elapsed = run_command([sys.executable, "scripts/pipeline/create_normalized_db.py"], cwd=WEBSITE_DIR)
        record("基础架构重建 (Schema Reconstruction)", ok, elapsed)
    else:
        record("基础架构重建 (Skipped - Reuse Data)", None, 0)

    # 4. 补全历史照片
    if not is_light:
        print("\n[步骤 4/12] 历史照片补全...")
        ok, elapsed = run_command([sys.executable, "scripts/pipeline/patch_historical_photos.py"], cwd=WEBSITE_DIR)
        record("历史照片补全 (Image Patching)", ok, elapsed)
    else:
        record("历史照片补全 (Skipped)", None, 0)

    # 5. 中文名称
    if not is_light:
        print("\n[步骤 5/12] 中文化翻译引擎...")
        ok, elapsed = run_command([sys.executable, "scripts/pipeline/add_driver_chinese_names.py"], cwd=WEBSITE_DIR)
        record("中文化翻译 (Multilingual Support)", ok, elapsed)
    else:
        record("中文化翻译 (Skipped)", None, 0)

    # 6. 冲刺赛导入
    if not is_light:
        print("\n[步骤 6/12] 冲刺赛数据集成...")
        ok, elapsed = run_command([sys.executable, "scripts/pipeline/import_sprint_data.py"], cwd=WEBSITE_DIR)
        record("冲刺赛集成 (Sprint Integration)", ok, elapsed)
    else:
        record("冲刺赛集成 (Skipped)", None, 0)

    # 7. 历史最快圈导入
    if not is_light:
        print("\n[步骤 7/12] 最快圈速库注入...")
        ok, elapsed = run_command([sys.executable, "scripts/pipeline/import_fastest_lap.py"], cwd=WEBSITE_DIR)
        record("最快圈速注入 (Fastest Lap Repo)", ok, elapsed)
    else:
        record("最快圈速注入 (Skipped)", None, 0)

    # 8. 特殊事件处理
    if not is_light:
        print("\n[步骤 8/12] 特殊事件规则应用 (Permanent DB Fixes)...")
        ok, elapsed = run_command([sys.executable, "scripts/pipeline/apply_special_events.py"], cwd=WEBSITE_DIR)
        record("特殊事件应用 (Special Events)", ok, elapsed)
    else:
        # 注意：此处不能热更新，因为现有的 apply_special_events.py 是累加型的
        record("特殊事件应用 (Skipped - Protected History)", None, 0)

    # 9. 冠军重算 (LIGHT 模式必须运行)
    print("\n[步骤 9/12] 年度冠军权威重算...")
    ok, elapsed = run_command(["node", "scripts/pipeline/recalculate_championships.cjs"], cwd=WEBSITE_DIR)
    record("冠军重算 (Championship Recalc)", ok, elapsed)

    # 10. 统计全聚合 (LIGHT 模式必须运行)
    print("\n[步骤 10/12] 全量数据统计全聚合...")
    ok, elapsed = run_command([sys.executable, "scripts/pipeline/recalculate_stats.py"], cwd=WEBSITE_DIR)
    record("全量统计聚合 (Global Stats Agg)", ok, elapsed)

    # 11. 照片索引更新
    print("\n[步骤 11/12] 视觉资产索引生成...")
    ok, elapsed = run_command([sys.executable, "scripts/pipeline/update_photo_index.py"], cwd=WEBSITE_DIR)
    record("照片索引更新 (Photo Index Gen)", ok, elapsed)

    # 12. 最终同步与审计
    print("\n[步骤 12/12] 最终同步与审计...")
    t0 = time.time()
    # 注入 JSON
    if NAS_MODE:
        refine_script = os.path.join(COLLECTOR_SCRIPTS_DIR, "refine_with_stats.py")
        if os.path.exists(refine_script):
            run_command([sys.executable, refine_script], cwd=WEBSITE_DIR, extra_env={'F1_DB_PATH': db_path})
        hot_update_nas(WEBSITE_DIR)
    else:
        # 本机开发模式
        refine_script_local = os.path.join(COLLECTOR_DIR, "refine_with_stats.py")
        if os.path.exists(refine_script_local):
            run_command([sys.executable, "refine_with_stats.py"], cwd=COLLECTOR_DIR)
        
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
