import os
import json
import requests
from urllib.parse import urlparse

# 路径配置
COLLECTOR_DIR = os.path.dirname(os.path.abspath(__file__))
# 新结构：assets/seasons/年度/...
DATA_DIR = os.path.join(COLLECTOR_DIR, 'data')

def download_file(url, target_path):
    if not url or not url.startswith('http'):
        return None
    
    if os.path.exists(target_path):
        if os.path.getsize(target_path) > 100:
            return True

    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    
    try:
        print(f"Downloading {url} ...")
        response = requests.get(url, stream=True, timeout=10)
        if response.status_code == 200:
            with open(target_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            return True
        else:
            print(f"Failed to download {url}: Status {response.status_code}")
    except Exception as e:
        print(f"Error downloading {url}: {e}")
    
    return False

def get_assets_dir(year):
    return os.path.join(COLLECTOR_DIR, 'assets', 'seasons', str(year))

def process_schedule(year=2026):
    path = os.path.join(DATA_DIR, f'schedule_{year}.json')
    if not os.path.exists(path): return
    
    assets_dir = get_assets_dir(year)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    changed = False
    for item in data:
        slug = item.get('slug', 'unknown')
        
        # 1. Outline Image
        if 'image' in item:
            url = item['image']
            if url.startswith('http'):
                ext = os.path.splitext(urlparse(url).path)[1] or '.svg'
                filename = f"{slug}_outline{ext}"
                target = os.path.join(assets_dir, 'tracks', filename)
                if download_file(url, target):
                    item['image'] = f"/photos/seasons/{year}/tracks/{filename}"
                    changed = True
            elif '/assets/' in url:
                item['image'] = url.replace('/assets/', f'/photos/seasons/')
        
        # 2. Detailed Image
        if 'detailedImage' in item:
            url = item['detailedImage']
            if url.startswith('http'):
                ext = os.path.splitext(urlparse(url).path)[1] or '.webp'
                filename = f"{slug}_detailed{ext}"
                target = os.path.join(assets_dir, 'tracks', filename)
                if download_file(url, target):
                    item['detailedImage'] = f"/photos/seasons/{year}/tracks/{filename}"
                    changed = True
            elif '/assets/' in url:
                item['detailedImage'] = url.replace('/assets/', f'/photos/seasons/')
        
        # 3. Flag Image
        if 'flag' in item:
            url = item['flag']
            # 特殊处理：旗帜通常存放在 assets/seasons/flags/
            country_name = item.get('country', 'unknown').capitalize().replace(' ', '_')
            if url.startswith('http'):
                ext = os.path.splitext(urlparse(url).path)[1] or '.svg'
                filename = f"{country_name}{ext}"
                target = os.path.join(COLLECTOR_DIR, 'assets', 'seasons', 'flags', filename)
                if download_file(url, target):
                    item['flag'] = f"/photos/seasons/flags/{filename}"
                    changed = True
            elif '/assets/flags/' in url:
                item['flag'] = url.replace('/assets/flags/', '/photos/seasons/flags/')
            elif '/assets/' in url: # 兜底逻辑
                item['flag'] = url.replace('/assets/', '/photos/seasons/')
                
    if changed or True: # Force update for path cleanup
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"[OK] Updated schedule_{year}.json")

def process_drivers(year=2026):
    path = os.path.join(DATA_DIR, f'drivers_{year}.json')
    if not os.path.exists(path): return
    
    assets_dir = get_assets_dir(year)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    changed = False
    for item in data:
        first = item.get('firstName', '').lower().replace(' ', '_')
        last = item.get('lastName', '').lower().replace(' ', '_')
        if not first or not last: continue
        
        url = item.get('officialImage', '') # Use officialImage as source
        if url.startswith('http'):
            ext = os.path.splitext(urlparse(url).path)[1] or '.webp'
            filename = f"{first}_{last}{ext}"
            target = os.path.join(assets_dir, 'drivers', filename)
            if download_file(url, target):
                item['image'] = f"/photos/seasons/{year}/drivers/{filename}"
                changed = True
        elif '/assets/' in url:
            item['image'] = url.replace('/assets/', f'/photos/seasons/')
            changed = True
                
    if changed or True:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"[OK] Updated drivers_{year}.json")

def process_teams(year=2026):
    path = os.path.join(DATA_DIR, f'teams_{year}.json')
    if not os.path.exists(path): return
    
    assets_dir = get_assets_dir(year)
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    changed = False
    for item in data:
        tid = item.get('id', 'unknown')
        
        # 1. Logo
        url = item.get('officialLogo', '')
        if url.startswith('http'):
            ext = os.path.splitext(urlparse(url).path)[1] or '.webp'
            filename = f"{tid}_logo{ext}"
            target = os.path.join(assets_dir, 'teams', filename)
            if download_file(url, target):
                item['logo'] = f"/photos/seasons/{year}/teams/{filename}"
                changed = True
        elif '/assets/' in url: # Fallback legacy paths
            item['logo'] = url.replace('/assets/', f'/photos/seasons/')
        
        # 2. Car Image
        url = item.get('officialCar', '')
        if url.startswith('http'):
            ext = os.path.splitext(urlparse(url).path)[1] or '.webp'
            filename = f"{tid}_car{ext}"
            target = os.path.join(assets_dir, 'teams', filename)
            if download_file(url, target):
                item['carImage'] = f"/photos/seasons/{year}/teams/{filename}"
                changed = True
        elif '/assets/' in url:
            item['carImage'] = url.replace('/assets/', f'/photos/seasons/')
                
    if changed or True:
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        print(f"[OK] Updated teams_{year}.json")

if __name__ == "__main__":
    current_year = 2026
    print(f"Starting asset download for {current_year} season...")
    process_schedule(current_year)
    process_drivers(current_year)
    process_teams(current_year)
    print("Asset download process completed.")
