import json
from pathlib import Path

def generate_teams_config():
    # 结合现有的 team_colors 颜色表和 TEAM_TRANSLATIONS 翻译表，
    # 加上所有的 Indy 500 车队来构建完美的 teams_config.json
    
    # 基础翻译表 (English Canonical -> Chinese)
    CN_TO_EN = {
        "Alfa Romeo": "阿尔法·罗密欧",
        "AlphaTauri": "阿尔法托利",
        "Arrows": "飞箭",
        "Aston Martin": "阿斯顿马丁",
        "Benetton": "贝纳通",
        "BMW": "宝马",
        "Caterham": "卡特汉姆",
        "Cooper": "库珀",
        "Dallara": "达拉拉",
        "Eagle": "老鹰",
        "Ferrari": "法拉利",
        "Ferrari Jaguar": "法拉利捷豹",
        "Force India": "印度力量",
        "Williams": "威廉姆斯",
        "Haas": "哈斯",
        "Honda": "本田",
        "Jordan": "乔丹",
        "Sauber": "索伯",
        "Kick Sauber": "Kick Sauber", 
        "Lola": "罗拉",
        "Lotus": "莲花",
        "Marussia": "玛鲁西亚",
        "Maserati": "玛莎拉蒂",
        "McLaren": "迈凯伦",
        "Mercedes": "梅赛德斯",
        "Minardi": "米纳尔迪",
        "Manor": "马诺",
        "Porsche": "保时捷",
        "Red Bull Racing": "红牛",
        "Toro Rosso": "红牛二队",
        "Renault": "雷诺",
        "Racing Point": "赛点",
        "Spyker": "世爵",
        "Toyota": "丰田",
        "Wolf": "沃尔夫",
        "Wolf-Williams": "沃尔夫-威廉姆斯",
        "Thin Wall Special": "薄壁-法拉利",
        "Lamborghini": "兰博基尼",
        "Jaguar": "捷豹",
        "Racing Bulls": "小红牛",
        "RB": "影角",
        "Alpine": "阿尔派",
        "Brawn GP": "布朗",
        "Tyrrell": "泰瑞尔",
        "Brabham": "布拉汉姆",
        "BMW Sauber": "宝马索伯"
    }

    # 提取现有 python 脚本中的颜色
    COLORS = {
        'McLaren': '#FF8000',
        'Red Bull Racing': '#3671C1',
        'Mercedes': '#27F4D2',
        'Ferrari': '#ED1131',
        'Aston Martin': '#229971',
        'Alpine': '#0093CC',
        'Williams': '#1868DB',
        'Toro Rosso': '#6692FF',
        'AlphaTauri': '#2B4562',
        'RB': '#6692FF',
        'Racing Bulls': '#6692FF',
        'Sauber': '#52E252',
        'Kick Sauber': '#52E252',
        'Alfa Romeo': '#900000',
        'BMW Sauber': '#00008B',
        'Haas': '#B6BABD',
        'Lotus': '#c5a059',
        'Renault': '#fff000',
        'Force India': '#f596c8'
    }

    # 前端处理器中隐藏的 Indy 500 车队列表
    HIDDEN_INDY_SPECIAL_TEAMS = [
        "Adams", "Deidt", "Snowberger", "Kurtis Kraft", "Watson", 
        "Stevens", "Langley", "Lesovsky", "Olson", "Wetteroth", 
        "Ewing", "Moore", "Marchese", "Nichels", "Rae", 
        "Schroeder", "Sherman", "Hall", "Trevis", "Epperly", 
        "Phillips", "Dunn", "Christensen", "Elder", "Sutton", 
        "Meskowski", "Kuzma"
    ]

    teams = []

    # 1. 加入已知有中文翻译的主流车队
    for en, cn in CN_TO_EN.items():
        slug = en.lower().replace(" ", "_").replace("-", "_")
        teams.append({
            "slug": slug,
            "name": en,
            "nameCn": cn,
            "color": COLORS.get(en, ""),
            "isHidden": False
        })
        
    # 2. 加入单独定义了颜色的其他车队 (不过绝大多数已经包含在上面)
    for en, color in COLORS.items():
        if not any(t["name"] == en for t in teams):
            slug = en.lower().replace(" ", "_").replace("-", "_")
            teams.append({
                "slug": slug,
                "name": en,
                "nameCn": en,  # 没中文翻译，留原来英文
                "color": color,
                "isHidden": False
            })

    # 3. 加入要屏蔽的 Indy 车队
    for indy in HIDDEN_INDY_SPECIAL_TEAMS:
        if not any(t["name"] == indy for t in teams):
            slug = indy.lower().replace(" ", "_")
            teams.append({
                "slug": slug,
                "name": indy,
                "nameCn": indy,
                "color": "",
                "isHidden": True
            })

    output_path = Path('d:/oc/f1express/scripts/teams_config.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(teams, f, ensure_ascii=False, indent=4)
        
    print(f"Generated {output_path} successfully!")

if __name__ == "__main__":
    generate_teams_config()
