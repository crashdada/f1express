import csv
from pathlib import Path

csv_path = Path('d:/oc/f1express/storage/csv/team_names.csv')
translations_path = Path('d:/oc/f1express/scripts/f1_translations.py')

# Mapping from current Chinese names in CSV to Standard English Names
CN_TO_EN = {
    "阿尔法·罗密欧": "Alfa Romeo",
    "阿尔法托利": "AlphaTauri",
    "飞箭": "Arrows",
    "阿斯顿马丁": "Aston Martin",
    "贝纳通": "Benetton",
    "宝马": "BMW",
    "卡特汉姆": "Caterham",
    "库珀": "Cooper",
    "达拉拉": "Dallara",
    "老鹰": "Eagle",
    "法拉利": "Ferrari",
    "法拉利捷豹": "Ferrari Jaguar",
    "印度力量": "Force India",
    "威廉姆斯": "Williams",
    "哈斯": "Haas",
    "本田": "Honda",
    "乔丹": "Jordan",
    "索伯": "Sauber",
    "Kick Sauber": "Kick Sauber",
    "罗拉": "Lola",
    "莲花": "Lotus",
    "玛鲁西亚": "Marussia",
    "玛莎拉蒂": "Maserati",
    "迈凯伦": "McLaren",
    "梅赛德斯": "Mercedes",
    "米纳尔迪": "Minardi",
    "马诺": "Manor",
    "保时捷": "Porsche",
    "红牛": "Red Bull Racing",
    "红牛二队": "Toro Rosso",
    "雷诺": "Renault",
    "赛点": "Racing Point",
    "世爵": "Spyker",
    "丰田": "Toyota",
    "沃尔夫": "Wolf",
    "沃尔夫-威廉姆斯": "Wolf-Williams",
    "薄壁-法拉利": "Thin Wall Special",
    "兰博基尼": "Lamborghini",
    "捷豹": "Jaguar"
}

def refactor_csv():
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        # We will keep header exactly. But maybe change the name of the column if we want. Let's keep parameter names same.
        rows = []
        for row in reader:
            if len(row) >= 2:
                cn_name = row[1].strip()
                en_name = CN_TO_EN.get(cn_name, cn_name) # fallback to original if not in mapping (e.g. English already)
                rows.append([row[0], en_name])
            else:
                rows.append(row)
                
    with open(csv_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(header)
        writer.writerows(rows)
    print("Successfully refactored team_names.csv to English!")

def append_translations():
    # Build dictionary text for f1_translations.py
    # We want EN_TO_CN dict, meaning reverse of CN_TO_EN
    en_to_cn = {v: k for k, v in CN_TO_EN.items()}
    # Some additions matching frontend
    en_to_cn["RB"] = "影角" # Or whatever makes sense, RB was translated to RB or 影角
    en_to_cn["Racing Bulls"] = "小红牛" 
    en_to_cn["Alpine"] = "阿尔派"
    en_to_cn["Brawn GP"] = "布朗"
    en_to_cn["Tyrrell"] = "泰瑞尔"
    en_to_cn["Brabham"] = "布拉汉姆"

    content = "\n# ---------------------------------------------------------------------------\n"
    content += "# Team name translations (English_name_in_DB → Chinese_display_name)\n"
    content += "# ---------------------------------------------------------------------------\n"
    content += "TEAM_TRANSLATIONS: dict[str, str] = {\n"
    for en, cn in en_to_cn.items():
        content += f'    "{en}": "{cn}",\n'
    content += "}\n"

    with open(translations_path, 'a', encoding='utf-8') as f:
        f.write(content)
        
    print("Successfully appended TEAM_TRANSLATIONS to f1_translations.py!")

if __name__ == "__main__":
    refactor_csv()
    append_translations()
