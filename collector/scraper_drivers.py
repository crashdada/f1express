import json
import os

import datetime

def generate_drivers(season=None):
    if season is None:
        season = datetime.datetime.now().year
    # 赛季车手与车队 Slug 映射表 (基于官方 CDN 规则)
    # 规则: https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:2026:fallback:driver:2026fallbackdriverright.webp/v1740000000/common/f1/2026/[TEAM_SLUG]/[DRIVER_ID]/2026[TEAM_SLUG][DRIVER_ID]right.webp
    
    TEAM_SLUGS = {
        "Ferrari": "ferrari",
        "Red Bull": "redbullracing",
        "Mercedes": "mercedes",
        "McLaren": "mclaren",
        "Aston Martin": "astonmartin",
        "Williams": "williams",
        "Alpine": "alpine",
        "Haas": "haas",
        "Audi": "audi",
        "Racing Bulls": "racingbulls",
        "Cadillac": "cadillac"
    }

    # 车手 ID 生成器 (Heuristic: First 3 + Last 3 + 01)
    def get_driver_id(first, last):
        # 特例处理
        overrides = {
            "Lewis Hamilton": "lewham01",
            "Max Verstappen": "maxver01",
            "Charles Leclerc": "chalec01",
            "Lando Norris": "lannor01",
            "Oscar Piastri": "oscpia01",
            "George Russell": "georus01",
            "Andrea Kimi Antonelli": "andant01",
            "Kimi Antonelli": "andant01",
            "Fernando Alonso": "feralo01",
            "Lance Stroll": "lanstr01",
            "Carlos Sainz": "carsai01",
            "Alexander Albon": "alealb01",
            "Pierre Gasly": "piegas01",
            "Franco Colapinto": "fracol01",
            "Esteban Ocon": "estoco01",
            "Oliver Bearman": "olibea01",
            "Nico Hulkenberg": "nichul01",
            "Gabriel Bortoleto": "gabbor01",
            "Liam Lawson": "lialaw01",
            "Arvid Lindblad": "arvlin01",
            "Sergio Perez": "serper01",
            "Valtteri Bottas": "valbot01",
            "Isack Hadjar": "isahad01"
        }
        full_name = f"{first} {last}"
        if full_name in overrides:
            return overrides[full_name]
        
        # 默认算法
        f = first.lower()[:3]
        l = last.lower()[:3]
        return f"{f}{l}01"

    # 加载基础数据 (从外部配置文件读取，方便修改号码、车队等)
    config_path = os.path.join("data", f"drivers_config_{season}.json")
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            drivers_raw = json.load(f)
    else:
        print(f"Warning: {config_path} not found. Using empty driver list.")
        drivers_raw = []

    processed = []
    for d in drivers_raw:
        driver_id = get_driver_id(d['firstName'], d['lastName'])
        team_slug = TEAM_SLUGS.get(d['team'], d['team'].lower().replace(" ", ""))
        
        # 构建官方 URL (保留备用)
        official_image_url = f"https://media.formula1.com/image/upload/c_lfill,w_440/q_auto/d_common:f1:{season}:fallback:driver:{season}fallbackdriverright.webp/v1740000000/common/f1/{season}/{team_slug}/{driver_id}/{season}{team_slug}{driver_id}right.webp"
        
        d['id'] = driver_id.replace("01", "") # 前端习惯 ID
        # 强制统一使用本地离线地址，这样前端从云端拉取更新 JSON 时，图片依然走本地
        
        first = d['firstName'].lower().replace(' ', '_')
        last = d['lastName'].lower().replace(' ', '_')
        d['image'] = f"/photos/seasons/{season}/drivers/{first}_{last}.webp"
        
        d['officialImage'] = official_image_url
        processed.append(d)

    os.makedirs("data", exist_ok=True)
    output_path = f"data/drivers_{season}.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(processed, f, indent=4, ensure_ascii=False)
    
    print(f"Successfully generated {len(processed)} drivers with official {season} image URLs.")

if __name__ == "__main__":
    generate_drivers()
