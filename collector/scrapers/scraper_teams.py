import json
import os

import datetime

def generate_teams(season=None):
    if season is None:
        season = datetime.datetime.now().year
    # 赛季车队 Slug 映射表 (基于官方 CDN 规则)
    # 车道图规则: https://media.formula1.com/image/upload/c_lfill,h_224/q_auto/d_common:f1:2026:fallback:car:2026fallbackcarright.webp/v1740000000/common/f1/2026/[TEAM_SLUG]/2026[TEAM_SLUG]carright.webp
    # Logo 规则 (Color): https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000000/common/f1/2026/[TEAM_SLUG]/2026[TEAM_SLUG]logo.webp
    
    # 翻译字典
    TRANSLATIONS = {
        "Ferrari": "法拉利",
        "Mercedes": "梅赛德斯",
        "Honda": "本田",
        "Audi": "奥迪",
        "Red Bull Ford": "红牛福特",
        "Maranello, Italy": "马拉内罗，意大利",
        "Milton Keynes, United Kingdom": "米尔顿凯恩斯，英国",
        "Brackley, United Kingdom": "布拉克利，英国",
        "Woking, United Kingdom": "沃金，英国",
        "Silverstone, United Kingdom": "银石，英国",
        "Hinwil, Switzerland": "欣维尔，瑞士",
        "Grove, United Kingdom": "格罗夫，英国",
        "Enstone, United Kingdom": "恩斯通，英国",
        "Kannapolis, United States": "坎纳波利斯，美国",
        "Faenza, Italy": "法恩扎，意大利",
        "Detroit, United States": "底特律，美国"
    }

    TEAM_CONFIGS = [
        {
            "id": "ferrari",
            "name": "Ferrari",
            "nameCn": "法拉利",
            "slug": "ferrari",
            "color": "#e10600",
            "engine": "Ferrari",
            "base": "Maranello, Italy",
            "drivers": ["LEC", "HAM"]
        },
        {
            "id": "red_bull",
            "name": "Red Bull Racing",
            "nameCn": "红牛",
            "slug": "redbullracing",
            "color": "#0600ef",
            "engine": "Red Bull Ford",
            "base": "Milton Keynes, United Kingdom",
            "drivers": ["VER", "HAD"]
        },
        {
            "id": "mercedes",
            "name": "Mercedes-AMG",
            "nameCn": "梅赛德斯",
            "slug": "mercedes",
            "color": "#27f4d2",
            "engine": "Mercedes",
            "base": "Brackley, United Kingdom",
            "drivers": ["RUS", "ANT"]
        },
        {
            "id": "mclaren",
            "name": "McLaren",
            "nameCn": "迈凯伦",
            "slug": "mclaren",
            "color": "#ff8700",
            "engine": "Mercedes",
            "base": "Woking, United Kingdom",
            "drivers": ["NOR", "PIA"]
        },
        {
            "id": "aston_martin",
            "name": "Aston Martin",
            "nameCn": "阿斯顿·马丁",
            "slug": "astonmartin",
            "color": "#229971",
            "engine": "Honda",
            "base": "Silverstone, United Kingdom",
            "drivers": ["ALO", "STR"]
        },
        {
            "id": "audi",
            "name": "Audi F1 Team",
            "nameCn": "奥迪",
            "slug": "audi",
            "color": "#f50537",
            "engine": "Audi",
            "base": "Hinwil, Switzerland",
            "drivers": ["HUL", "BOR"]
        },
        {
            "id": "williams",
            "name": "Williams",
            "nameCn": "威廉姆斯",
            "slug": "williams",
            "color": "#64c4ff",
            "engine": "Mercedes",
            "base": "Grove, United Kingdom",
            "drivers": ["ALB", "SAI"]
        },
        {
            "id": "alpine",
            "name": "Alpine",
            "nameCn": "阿尔派",
            "slug": "alpine",
            "color": "#0093cc",
            "engine": "Mercedes",
            "base": "Enstone, United Kingdom",
            "drivers": ["GAS", "COL"]
        },
        {
            "id": "haas",
            "name": "Haas",
            "nameCn": "哈斯",
            "slug": "haas",
            "color": "#b6babd",
            "engine": "Ferrari",
            "base": "Kannapolis, United States",
            "drivers": ["OCO", "BEA"]
        },
        {
            "id": "rb",
            "name": "Racing Bulls",
            "nameCn": "RB",
            "slug": "racingbulls",
            "color": "#6692ff",
            "engine": "Red Bull Ford",
            "base": "Faenza, Italy",
            "drivers": ["LAW", "LIN"]
        },
        {
            "id": "cadillac",
            "name": "Cadillac F1 Team",
            "nameCn": "凯迪拉克",
            "slug": "cadillac",
            "color": "#ffce00",
            "engine": "Ferrari",
            "base": "Detroit, United States",
            "drivers": ["PER", "BOT"]
        }
    ]

    processed = []
    for team in TEAM_CONFIGS:
        slug = team['slug']
        
        # 使用彩色版 Logo URL，解决镂空问题
        official_logo_url = f"https://media.formula1.com/image/upload/c_lfill,w_48/q_auto/v1740000000/common/f1/{season}/{slug}/{season}{slug}logo.webp"
        
        # 赛车图
        official_car_url = f"https://media.formula1.com/image/upload/c_lfill,h_224/q_auto/d_common:f1:{season}:fallback:car:{season}fallbackcarright.webp/v1740000000/common/f1/{season}/{slug}/{season}{slug}carright.webp"
        
        team_data = {
            "id": team['id'],
            "name": team['name'],
            "nameCn": team['nameCn'],
            "color": team['color'],
            "logo": f"/photos/seasons/{season}/teams/{team['id']}_logo.webp",
            "drivers": team['drivers'],
            "carImage": f"/photos/seasons/{season}/teams/{team['id']}_car.webp",
            "officialLogo": official_logo_url,
            "officialCar": official_car_url,
            "engine": team['engine'],
            "engineCn": TRANSLATIONS.get(team['engine'], team['engine']),
            "base": team['base'],
            "baseCn": TRANSLATIONS.get(team['base'], team['base'])
        }
        processed.append(team_data)

    os.makedirs("data", exist_ok=True)
    output_path = f"data/teams_{season}.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(processed, f, indent=4, ensure_ascii=False)
    
    print(f"Successfully generated {len(processed)} teams for {season} with localized assets and color logos.")

if __name__ == "__main__":
    generate_teams()
