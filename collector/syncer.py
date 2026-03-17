#!/usr/bin/env python3
"""
F1 Data Syncer — 跨环境数据同步工具

自动检测环境并定位展示站路径：
  - 本地开发（源码目录）：检测到 package.json → 写入 public/data/ 和 public/
  - NAS 部署（网页产物）：检测到 dist/ 目录 → 优先写入 dist/data/ 实现热更新
  - NAS 部署（根目录模式）：若无 dist/ → 降级写入根目录 data/

# NAS 实际部署结构 (模式 B):               本地开发源码结构 (模式 A):
#   /workspace/ (或 web/)                 /your-path/oc/ (或 Desktop/oc/)
#   ├── f1-collector/ (抓取工具)           ├── f1-collector/ (抓取工具)
#   │   ├── syncer.py                     │   ├── syncer.py
#   │   └── data/f1.db                    │   └── data/f1.db
#   └── f1-website/   (生产产物)           └── f1-website/   (React 源码)
#       ├── index.html                    ├── package.json
#       ├── data/f1.db                    ├── public/data/f1.db
#       └── data/*.json  <-- 同步点        │   └── data/*.json  <-- 同步点
#                                         └── src/

用法：
  python syncer.py               # 同步所有 2026 JSON (热更新推荐)
  python syncer.py --db          # 同步 f1.db (仅当 collector 目录下有 db 时)
  python syncer.py --all         # 同步 JSON + DB
  python syncer.py --scrape      # 运行抓取并立即同步至网页
"""

import json
import os
import shutil
import argparse
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Import central config
sys.path.append(str(Path(__file__).resolve().parent / ".." / "scripts"))
try:
    from f1_config import get_path, ensure_dirs, STORAGE_ROOT
    HAS_CONFIG = True
except ImportError:
    HAS_CONFIG = False

# 路径计算
COLLECTOR_DIR = os.path.dirname(os.path.abspath(__file__))
WEBSITE_DIR = os.path.dirname(COLLECTOR_DIR) # f1express 内部结构，父目录就是网站根目录

# 环境检测：有 package.json 说明是本地源码开发环境
IS_LOCAL = os.path.exists(os.path.join(WEBSITE_DIR, 'package.json'))

JSON_SOURCE = os.path.join(COLLECTOR_DIR, 'data')

if HAS_CONFIG:
    ensure_dirs()
    ENV_NAME = f'F1 Storage Mode (Root: {STORAGE_ROOT})'
    WEBSITE_ROOT = STORAGE_ROOT.parent # Approximation
    JSON_TARGET = str(get_path('live'))
    DB_TARGET = str(get_path('root')) # Place DB in storage root for easiest access
    PHOTO_TARGET = str(get_path('photos'))
else:
    if IS_LOCAL:
        # 本地开发：目标是源码的 public 目录
        ENV_NAME = '本地源码环境 (Development)'
        WEBSITE_ROOT = os.path.join(WEBSITE_DIR, 'public') # 本地源码根目录
        JSON_TARGET = os.path.join(WEBSITE_ROOT, 'data')
        DB_TARGET = JSON_TARGET  # 数据库放在 data 目录下
    else:
        # NAS 部署：目标通常是构建好的产物目录 (dist)
        potential_dist = os.path.join(WEBSITE_DIR, 'dist')
        if os.path.exists(potential_dist):
            WEBSITE_ROOT = potential_dist
            ENV_NAME = f'NAS 生产构建环境 (Target: {os.path.basename(potential_dist)})'
        else:
            WEBSITE_ROOT = WEBSITE_DIR
            ENV_NAME = f'NAS 根目录环境 (Target: {os.path.basename(WEBSITE_DIR)})'
        
        JSON_TARGET = os.path.join(WEBSITE_ROOT, 'data')
        DB_TARGET = JSON_TARGET  # 数据库放在 data 目录下
    PHOTO_TARGET = os.path.join(WEBSITE_ROOT, 'photos')
def get_json_files(season):
    return [
        f'schedule_{season}.json',
        f'drivers_{season}.json',
        f'teams_{season}.json',
        f'results_{season}.json',
    ]


def log(msg):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f'[{ts}] {msg}')


# 预设的基础映射（作为 fallback，防止 mappings.json 加载失败）
DEFAULT_FLAGS = {
    'UNITED STATES': 'USA',
    'MIAMI': 'USA',
    'LAS VEGAS': 'USA',
    'BARCELONA-CATALUNYA': 'Spain',
    'ABU DHABI': 'UAE',
    'GREAT BRITAIN': 'Great_Britain',
    'SAUDI ARABIA': 'Saudi_Arabia',
}

# 加载映射配置
MAPPINGS_FILE = os.path.join(COLLECTOR_DIR, 'config', 'mappings.json')
MAPPINGS = {"flags": DEFAULT_FLAGS, "teams": {}}

if os.path.exists(MAPPINGS_FILE):
    try:
        with open(MAPPINGS_FILE, 'r', encoding='utf-8') as f:
            extra_mappings = json.load(f)
            # 合并配置
            if 'flags' in extra_mappings:
                MAPPINGS['flags'].update(extra_mappings['flags'])
            if 'teams' in extra_mappings:
                MAPPINGS['teams'].update(extra_mappings['teams'])
        log(f'[OK] 已加载自定义映射: {MAPPINGS_FILE}')
    except Exception as e:
        log(f'[!] 加载 mappings.json 失败: {e}')
else:
    log(f'[!] 映射配置文件不存在，使用内置预设: {MAPPINGS_FILE}')

MISSING_RESOURCES = set()


def get_flag_name(country_raw):
    """根据国家名称获取对应的国旗文件名"""
    if not country_raw:
        return "Unknown"
        
    upper_country = country_raw.upper().strip()
    
    # 1. 检查映射表
    if upper_country in MAPPINGS.get('flags', {}):
        return MAPPINGS['flags'][upper_country]
    
    # 2. 默认转换逻辑
    return country_raw.strip().title().replace(' ', '_')


def normalize_json_paths(filename, data):
    """强制标准化 JSON 中的图片路径，确保与 assets 命名一致"""
    modified = False
    
    import re
    season = "2026"
    match = re.search(r'_(\d{4})\.json$', filename)
    if match:
        season = match.group(1)
    
    if filename.startswith('drivers_') and isinstance(data, list):
        for d in data:
            first = d.get('firstName', '').lower().replace(' ', '_')
            last = d.get('lastName', '').lower().replace(' ', '_')
            full_name_id = f"{first}_{last}"
            target_path = f"/photos/seasons/{season}/drivers/{full_name_id}.webp"
            if d.get('image') != target_path:
                d['image'] = target_path
                modified = True
                
    elif filename.startswith('teams_') and isinstance(data, list):
        for t in data:
            # 1. 获取基础 ID
            tid = t.get('id')
            raw_name = t.get('name', '').upper()
            
            # 2. 检查是否有映射覆盖 (例如 KICK SAUBER -> audi)
            mapped_id = MAPPINGS.get('teams', {}).get(raw_name, tid)
            
            # 3. 标准化路径
            logo_path = f"/photos/seasons/{season}/teams/{mapped_id}_logo.webp"
            car_path = f"/photos/seasons/{season}/teams/{mapped_id}_car.webp"
            
            if t.get('logo') != logo_path:
                t['logo'] = logo_path
                modified = True
            if t.get('carImage') != car_path:
                t['carImage'] = car_path
                modified = True
                
    elif filename.startswith('schedule_') and isinstance(data, list):
        tracks_dir = os.path.join(WEBSITE_ROOT, 'photos', 'seasons', season, 'tracks')
        
        for event in data:
            slug = event.get('slug')
            country_raw = event.get('country', '')
            
            # 使用映射系统获取国旗
            flag_name = get_flag_name(country_raw)
            
            # 动态检测赛道图后缀 (SVG vs PNG/WebP)
            def find_ext(folder, base_name, default_ext):
                if not os.path.exists(folder):
                    return default_ext
                for ext in ['.svg', '.webp', '.png', '.jpg']:
                    if os.path.exists(os.path.join(folder, f"{base_name}{ext}")):
                        return ext
                return default_ext

            outline_ext = find_ext(tracks_dir, f"{slug}_outline", ".svg")
            detailed_ext = find_ext(tracks_dir, f"{slug}_detailed", ".webp")

            # 标准化路径
            image_path = f"/photos/seasons/{season}/tracks/{slug}_outline{outline_ext}"
            detailed_path = f"/photos/seasons/{season}/tracks/{slug}_detailed{detailed_ext}"
            flag_path = f"/photos/seasons/flags/{flag_name}.svg"
            
            if event.get('image') and event.get('image') != image_path:
                event['image'] = image_path
                modified = True
            if event.get('detailedImage') and event.get('detailedImage') != detailed_path:
                event['detailedImage'] = detailed_path
                modified = True
            if event.get('flag') != flag_path:
                event['flag'] = flag_path
                modified = True
                
    return data, modified


def sync_json(filename):
    """同步单个 JSON 文件并自动执行路径本地化"""
    source = os.path.join(COLLECTOR_DIR, 'data', filename)
    target = os.path.join(JSON_TARGET, filename)

    if not os.path.exists(source):
        log(f'[!] 源文件不存在: {source}')
        return False

    os.makedirs(JSON_TARGET, exist_ok=True)

    # 加载源数据
    try:
        with open(source, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        log(f'[!] JSON 格式错误 {filename}: {e}')
        return False

    # 核心自动化：无论源数据是什么路径，同步时强制本地化
    data, modified = normalize_json_paths(filename, data)

    # 检查目标文件是否已存在且内容一致
    if os.path.exists(target):
        with open(target, 'r', encoding='utf-8') as f:
            try:
                if json.load(f) == data:
                    log(f'• {filename} 无变更，跳过')
                    return True
            except json.JSONDecodeError:
                pass

    # 写入目标文件 (如果是 NAS 环境，这步实现了“热修复”)
    with open(target, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        
    count = len(data) if isinstance(data, list) else 'object'
    log(f'[OK] {filename} ({count} entries) -> {target} (Localized: {modified})')
    return True



def sync_db():
    """同步 f1.db"""
    source = os.path.join(COLLECTOR_DIR, 'data', 'f1.db')
    target = os.path.join(DB_TARGET, 'f1.db')

    if not os.path.exists(source):
        log(f'[!] 数据库文件不存在: {source}')
        return False

    if os.path.exists(target):
        src_stat = os.stat(source)
        dst_stat = os.stat(target)
        # 同时比较大小和修改时间，避免相同大小不同内容时被跳过
        if (src_stat.st_size == dst_stat.st_size and
                src_stat.st_mtime <= dst_stat.st_mtime):
            log(f'• f1.db 无变更，跳过')
            return True

    shutil.copy2(source, target)
    log(f'[OK] f1.db ({os.path.getsize(target):,} bytes) → {target}')
    return True


def sync_assets():
    """同步 assets 和 photos 目录 (合并至展示端 photos 目录)"""
    # 优先从 storage root 获取源 assets/目录
    if HAS_CONFIG:
        source_assets = str(get_path('assets'))
    else:
        source_assets = os.path.join(COLLECTOR_DIR, 'assets')
        
    # 同步 photos (车手照片等) -> 目标网站的 photos 目录
    source_photos = os.path.join(COLLECTOR_DIR, 'photos')
    
    # 统一目标：无论是 assets 还是 photos，在展示端都放在 photos 目录下
    target_photos = PHOTO_TARGET

    # 处理两个源文件夹至同一个目标文件夹
    for source in [source_assets, source_photos]:
        target = target_photos
        if not source or not os.path.exists(source):
            continue
            
        log(f'[...] 同步 {os.path.basename(source)} 目录 → {target}')
    
        # 使用 shutil.copytree 实现增量或覆盖同步
        if os.path.exists(target):
            # 如果目标已存在，手动遍历拷贝以实现“合并/覆盖”
            for root, dirs, files in os.walk(source):
                relative_path = os.path.relpath(root, source)
                dest_dir = os.path.join(target, relative_path)
                os.makedirs(dest_dir, exist_ok=True)
                for f in files:
                    src_file = os.path.join(root, f)
                    dst_file = os.path.join(dest_dir, f)
                    # 仅当文件不存在或大小不同时拷贝
                    if not os.path.exists(dst_file) or os.path.getsize(src_file) != os.path.getsize(dst_file):
                        shutil.copy2(src_file, dst_file)
        else:
            shutil.copytree(source, target)
    
    log(f'[OK] 资源目录 (assets/photos) 同步完成')
    return True


def run_scraper():
    """运行 scraper.py"""
    scraper = os.path.join(COLLECTOR_DIR, 'scraper.py')
    if not os.path.exists(scraper):
        log('[!] scraper.py 不存在')
        return False

    log('[...] 运行 scraper.py ...')
    result = subprocess.run(
        [sys.executable, scraper],
        cwd=COLLECTOR_DIR,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        log(f'[!] scraper.py 失败:\n{result.stderr}')
        return False

    if result.stdout.strip():
        for line in result.stdout.strip().split('\n'):
            log(f'  scraper: {line}')
    log('[OK] scraper.py 完成')
    return True


def main():
    parser = argparse.ArgumentParser(description='F1 数据同步工具')
    parser.add_argument('--schedule', action='store_true', help='仅同步赛程')
    parser.add_argument('--db', action='store_true', help='同步 f1.db')
    parser.add_argument('--assets', action='store_true', help='仅同步 assets 资源')
    parser.add_argument('--all', action='store_true', help='JSON + DB + Assets 全部同步')
    parser.add_argument('--scrape', action='store_true', help='先采集再同步')
    parser.add_argument('--season', type=int, default=datetime.now().year, help='指定同步的赛季年份')
    args = parser.parse_args()

    json_files = get_json_files(args.season)

    log('=' * 50)
    log(f'F1 Syncer | 环境: {ENV_NAME} | 赛季: {args.season}')
    log(f'采集端: {COLLECTOR_DIR}')
    log(f'JSON ←  {JSON_SOURCE}')
    log(f'JSON →  {JSON_TARGET}')
    log('=' * 50)

    if not os.path.exists(WEBSITE_DIR):
        log(f'[!] 展示站目录不存在: {WEBSITE_DIR}')
        sys.exit(1)

    if args.scrape:
        if not run_scraper():
            log('[!] 采集失败，继续同步已有数据...')

    if args.schedule:
        sync_json(f'schedule_{args.season}.json')
    elif args.db:
        sync_db()
    elif args.assets:
        sync_assets()
    elif args.all:
        for f in json_files:
            sync_json(f)
        sync_db()
        sync_assets()
    else:
        # 默认同步所有 JSON 和 Assets
        for f in json_files:
            sync_json(f)
        sync_assets()

    # 最后自动生成照片索引，确保前端能找到新同步的文件
    log('[...] 正在生成照片索引...')
    photo_indexer = os.path.join(WEBSITE_DIR, 'scripts', 'update_photo_index.py')
    if os.path.exists(photo_indexer):
        subprocess.run([sys.executable, photo_indexer], cwd=WEBSITE_DIR)
        log('[OK] 照片索引已更新')

    log('同步完成 [OK]')


if __name__ == '__main__':
    main()
