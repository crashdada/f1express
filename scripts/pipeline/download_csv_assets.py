import os
import csv
import requests
import re
import sys
from pathlib import Path

# Add parent directory to sys.path to import f1_config
sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import get_path, ensure_dirs

# 路径配置
ensure_dirs()
BASE_DIR = Path(__file__).resolve().parent.parent.parent
CSV_DIR = BASE_DIR / 'csv'
PHOTOS_DIR = get_path('photos') / 'custom'

def download_file(url, target_path, force=False):
    try:
        # 如果文件已存在且大小正常，除非强制下载，否则跳过
        if os.path.exists(target_path) and os.path.getsize(target_path) > 100 and not force:
            return True
        print(f"  Downloading {url} -> {os.path.basename(target_path)}")
        headers = {'User-Agent': 'Mozilla/5.0 (compatible; F1DataBot/1.0)'}
        r = requests.get(url, timeout=15, headers=headers)
        if r.status_code == 200:
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            with open(target_path, 'wb') as f:
                f.write(r.content)
            return True
        else:
            print(f"  [Error] HTTP {r.status_code}: {url}")
    except Exception as e:
        print(f"  [Error] {e}")
    return False

def clean_filename(name):
    return re.sub(r'[^\w\-_]', '_', name)

def get_row_value(row, keys, default=''):
    """处理带有 BOM 或不同空格的 CSV 键"""
    raw_keys = list(row.keys())
    for k in keys:
        if k in row: return row[k]
        for rk in raw_keys:
            if rk and k in rk: return row[rk]
    return default

def process_driver_csv():
    path = os.path.join(CSV_DIR, 'driver_photos.csv')
    if not os.path.exists(path): return
    
    print("Processing driver_photos.csv ...")
    rows = []
    changed = False
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        
        # 确保有 '原始来源' 列
        if '原始来源' not in fieldnames:
            fieldnames.append('原始来源')
            changed = True
            
        for row in reader:
            url = get_row_value(row, ['网址', 'url'])
            source = get_row_value(row, ['原始来源', 'source'])
            code = get_row_value(row, ['缩写', 'code'])
            
            # 如果网址是 http，先存入原始来源
            if url.startswith('http') and not source:
                row['原始来源'] = url
                source = url
                changed = True

            # 下载逻辑
            if source and source.startswith('http'):
                filename = f"avatar_{code}.webp"
                target = os.path.join(PHOTOS_DIR, 'drivers', filename)
                
                # F1 CDN 图片优化
                download_url = source
                if 'media.formula1.com' in download_url:
                    download_url = re.sub(r'c_\w+,w_\d+', 'c_fill,g_face,w_600,h_600', download_url)
                
                if download_file(download_url, target):
                    local_path = f"/photos/custom/drivers/{filename}"
                    if row.get('网址') != local_path:
                        row['网址'] = local_path
                        changed = True
            rows.append(row)
            
    if changed:
        with open(path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

def process_team_csv():
    path = os.path.join(CSV_DIR, 'team_photos.csv')
    if not os.path.exists(path): return
    
    print("Processing team_photos.csv ...")
    rows = []
    changed = False
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames)
        
        # 确保有 '原始来源' 列
        if '原始来源' not in fieldnames:
            fieldnames.append('原始来源')
            changed = True
            
        for row in reader:
            url = get_row_value(row, ['网址', 'url'])
            source = get_row_value(row, ['原始来源', 'source'])
            team = get_row_value(row, ['车队', 'team'])
            
            # 兼容逻辑：如果网址是 http 且来源为空，迁移
            if url.startswith('http') and not source:
                row['原始来源'] = url
                source = url
                changed = True

            # 下载逻辑
            if source and source.startswith('http'):
                filename = f"logo_{clean_filename(team)}.webp"
                target = os.path.join(PHOTOS_DIR, 'teams', filename)
                
                # 如果本地文件丢失或来源是新的，进行下载
                if download_file(source, target):
                    local_path = f"/photos/custom/teams/{filename}"
                    if row.get('网址') != local_path:
                        row['网址'] = local_path
                        changed = True
            rows.append(row)
            
    if changed:
        with open(path, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

if __name__ == "__main__":
    print("Starting smart localization of CSV assets...")
    process_driver_csv()
    process_team_csv()
    print("CSV assets process completed.")
