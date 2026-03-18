#!/usr/bin/env python3
"""
Populate Chinese driver names in the historical SQLite database.

This step is part of the legacy 13-step pipeline and must remain runnable after
every database rebuild.
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))
from f1_config import ensure_dirs, get_path


DRIVER_TRANSLATIONS: list[tuple[str, str, str, str]] = [
    # Modern and active drivers
    ("Lewis", "Hamilton", "刘易斯", "汉密尔顿"),
    ("Max", "Verstappen", "马克斯", "维斯塔潘"),
    ("Charles", "Leclerc", "夏尔", "勒克莱尔"),
    ("Lando", "Norris", "兰多", "诺里斯"),
    ("Carlos", "Sainz", "卡洛斯", "塞恩斯"),
    ("George", "Russell", "乔治", "拉塞尔"),
    ("Sergio", "Perez", "塞尔吉奥", "佩雷兹"),
    ("Sergio", "Pérez", "塞尔吉奥", "佩雷兹"),
    ("Fernando", "Alonso", "费尔南多", "阿隆索"),
    ("Oscar", "Piastri", "奥斯卡", "皮亚斯特里"),
    ("Pierre", "Gasly", "皮埃尔", "加斯利"),
    ("Esteban", "Ocon", "埃斯特班", "奥康"),
    ("Lance", "Stroll", "兰斯", "斯特罗尔"),
    ("Yuki", "Tsunoda", "角田", "裕毅"),
    ("Alexander", "Albon", "亚历山大", "阿尔本"),
    ("Daniel", "Ricciardo", "丹尼尔", "里卡多"),
    ("Valtteri", "Bottas", "瓦尔特利", "博塔斯"),
    ("Zhou", "Guanyu", "周", "冠宇"),
    ("Kevin", "Magnussen", "凯文", "马格努森"),
    ("Nico", "Hulkenberg", "尼科", "霍肯伯格"),
    ("Nico", "Hülkenberg", "尼科", "霍肯伯格"),
    ("Logan", "Sargeant", "洛根", "萨金特"),
    ("Nyck", "De Vries", "尼克", "德弗里斯"),
    ("Liam", "Lawson", "利亚姆", "劳森"),
    ("Franco", "Colapinto", "弗兰科", "科拉平托"),
    ("Oliver", "Bearman", "奥利弗", "贝尔曼"),
    ("Jack", "Doohan", "杰克", "杜汉"),
    ("Kimi", "Antonelli", "基米", "安东内利"),
    ("Isack", "Hadjar", "伊萨克", "哈贾尔"),
    ("Gabriel", "Bortoleto", "加布里埃尔", "博托莱托"),
    ("Mick", "Schumacher", "米克", "舒马赫"),
    ("Bruno", "Senna", "布鲁诺", "塞纳"),
    ("Jos", "Verstappen", "约斯", "维斯塔潘"),
    ("Nikita", "Mazepin", "尼基塔", "马泽平"),
    ("Pietro", "Fittipaldi", "彼得罗", "菲蒂帕尔迪"),
    ("Jack", "Aitken", "杰克", "艾特肯"),
    ("Rio", "Haryanto", "里奥", "哈里扬托"),
    ("Alexander", "Rossi", "亚历山大", "罗西"),
    ("Roberto", "Merhi", "罗伯托", "梅里"),
    ("Will", "Stevens", "威尔", "史蒂文斯"),
    ("Andre", "Lotterer", "安德烈", "洛特勒"),
    ("Charles", "Pic", "夏尔", "皮克"),
    ("Giedo", "van der Garde", "吉多", "范德加德"),
    ("Max", "Chilton", "马克斯", "奇尔顿"),
    ("Jerome", "d'Ambrosio", "热罗姆", "丹布罗西奥"),
    ("Lucas", "di Grassi", "卢卡斯", "迪格拉西"),
    ("Karun", "Chandhok", "卡伦", "钱多克"),
    ("Markus", "Winkelhock", "马库斯", "温克尔霍克"),
    ("Sakon", "Yamamoto", "佐藤", "山本"),
    ("Franck", "Montagny", "弗兰克", "蒙塔尼"),
    ("Yuji", "Ide", "井出", "有治"),
    ("Scott", "Speed", "斯科特", "斯皮德"),
    ("Robert", "Doornbos", "罗伯特", "多恩博斯"),
    ("Giorgio", "Pantano", "乔治奥", "潘塔诺"),

    # Champions and major historical drivers
    ("Michael", "Schumacher", "迈克尔", "舒马赫"),
    ("Ayrton", "Senna", "艾尔顿", "塞纳"),
    ("Alain", "Prost", "阿兰", "普罗斯特"),
    ("Niki", "Lauda", "尼基", "劳达"),
    ("Juan Manuel", "Fangio", "胡安·曼努埃尔", "方吉奥"),
    ("Sebastian", "Vettel", "塞巴斯蒂安", "维特尔"),
    ("Kimi", "Räikkönen", "基米", "莱科宁"),
    ("Kimi", "Raikkonen", "基米", "莱科宁"),
    ("Jenson", "Button", "简森", "巴顿"),
    ("Mika", "Hakkinen", "米卡", "哈基宁"),
    ("Mika", "Häkkinen", "米卡", "哈基宁"),
    ("Nigel", "Mansell", "奈杰尔", "曼塞尔"),
    ("Jackie", "Stewart", "杰基", "斯图尔特"),
    ("Jim", "Clark", "吉姆", "克拉克"),
    ("Emerson", "Fittipaldi", "埃默森", "菲蒂帕尔迪"),
    ("Nelson", "Piquet", "尼尔森", "皮奎特"),
    ("Damon", "Hill", "达蒙", "希尔"),
    ("Graham", "Hill", "格雷厄姆", "希尔"),
    ("Phil", "Hill", "菲尔", "希尔"),
    ("Jacques", "Villeneuve", "雅克", "维伦纽夫"),
    ("Gilles", "Villeneuve", "吉尔", "维伦纽夫"),
    ("Jochen", "Rindt", "约亨", "林特"),
    ("James", "Hunt", "詹姆斯", "亨特"),
    ("Mike", "Hawthorn", "迈克", "霍桑"),
    ("John", "Surtees", "约翰", "苏尔蒂斯"),
    ("Denny", "Hulme", "丹尼", "休姆"),
    ("Jack", "Brabham", "杰克", "布拉汉姆"),
    ("Alberto", "Ascari", "阿尔贝托", "阿斯卡里"),
    ("Giuseppe", "Farina", "朱塞佩", "法里纳"),
    ("Nino", "Farina", "尼诺", "法里纳"),
    ("Jody", "Scheckter", "乔迪", "谢克特"),
    ("Alan", "Jones", "艾伦", "琼斯"),
    ("Keke", "Rosberg", "凯凯", "罗斯伯格"),
    ("Nico", "Rosberg", "尼科", "罗斯伯格"),
    ("Rubens", "Barrichello", "鲁本斯", "巴里切罗"),
    ("Felipe", "Massa", "费利佩", "马萨"),
    ("Mark", "Webber", "马克", "韦伯"),
    ("David", "Coulthard", "大卫", "库特哈德"),
    ("Ralf", "Schumacher", "拉尔夫", "舒马赫"),
    ("Juan Pablo", "Montoya", "胡安·巴勃罗", "蒙托亚"),
    ("Giancarlo", "Fisichella", "詹卡洛", "费斯切拉"),
    ("Jarno", "Trulli", "雅诺", "特鲁利"),
    ("Eddie", "Irvine", "埃迪", "欧文"),
    ("Heinz-Harald", "Frentzen", "海因茨-哈拉尔德", "弗伦岑"),
    ("Gerhard", "Berger", "格哈德", "伯格"),
    ("Jean", "Alesi", "让", "阿莱西"),
    ("Riccardo", "Patrese", "里卡多", "帕特雷塞"),
    ("Thierry", "Boutsen", "蒂埃里", "布特森"),
    ("Michele", "Alboreto", "米凯莱", "阿尔博雷托"),
    ("René", "Arnoux", "勒内", "阿尔努"),
    ("Rene", "Arnoux", "勒内", "阿尔努"),
    ("Patrick", "Tambay", "帕特里克", "坦贝"),
    ("Didier", "Pironi", "迪迪埃", "皮罗尼"),
    ("Ronnie", "Peterson", "罗尼", "彼得森"),
    ("Clay", "Regazzoni", "克莱", "雷加佐尼"),
    ("Carlos", "Reutemann", "卡洛斯", "罗伊特曼"),
    ("Jacky", "Ickx", "杰基", "伊克斯"),
    ("Mario", "Andretti", "马里奥", "安德烈蒂"),
    ("Stirling", "Moss", "斯特林", "莫斯"),
    ("Tony", "Brooks", "托尼", "布鲁克斯"),
    ("Peter", "Collins", "彼得", "柯林斯"),
]


def add_chinese_names() -> None:
    ensure_dirs()
    db_path = str(get_path("db"))
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("开始更新车手中文名称...")
    updated_count = 0

    for first_name, last_name, first_name_cn, last_name_cn in DRIVER_TRANSLATIONS:
        cursor.execute(
            """
            UPDATE drivers
            SET first_name_cn = ?, last_name_cn = ?
            WHERE first_name = ? AND last_name = ?
            """,
            (first_name_cn, last_name_cn, first_name, last_name),
        )
        updated_count += cursor.rowcount

    conn.commit()

    total_with_chinese = cursor.execute(
        "SELECT COUNT(*) FROM drivers WHERE first_name_cn IS NOT NULL AND first_name_cn != ''"
    ).fetchone()[0]
    total_drivers = cursor.execute("SELECT COUNT(*) FROM drivers").fetchone()[0]

    print("\n[OK] 完成！")
    print(f"  更新了 {updated_count} 位车手的中文名称")
    print(f"  总共 {total_drivers} 位车手，其中 {total_with_chinese} 位有中文名")

    conn.close()


if __name__ == "__main__":
    add_chinese_names()
