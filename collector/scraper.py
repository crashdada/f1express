import requests
import time
import json
import re
from bs4 import BeautifulSoup
import datetime
import os

class F1DataCollector:
    def __init__(self, season=None):
        self.season = season or datetime.datetime.now().year
        self.base_url = "https://www.formula1.com"
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        # 2026 赛季元数据修正映射
        self.SEASON_2026_CONFIG = {
            "australia": {"country": "AUSTRALIA", "location": "Melbourne", "gp": "Australian Grand Prix", "flag": "Australia.svg"},
            "china": {"country": "CHINA", "location": "Shanghai", "gp": "Chinese Grand Prix", "flag": "China.svg"},
            "japan": {"country": "JAPAN", "location": "Suzuka", "gp": "Japanese Grand Prix", "flag": "Japan.svg"},
            "bahrain": {"country": "BAHRAIN", "location": "Sakhir", "gp": "Bahrain Grand Prix", "flag": "Bahrain.svg"},
            "saudi-arabia": {"country": "SAUDI ARABIA", "location": "Jeddah", "gp": "Saudi Arabian Grand Prix", "flag": "Saudi_Arabia.svg"},
            "miami": {"country": "USA", "location": "Miami", "gp": "Miami Grand Prix", "flag": "USA.svg"},
            "emilia-romagna": {"country": "ITALY", "location": "Imola", "gp": "Emilia Romagna Grand Prix", "flag": "Italy.svg"},
            "monaco": {"country": "MONACO", "location": "Monaco", "gp": "Monaco Grand Prix", "flag": "Monaco.svg"},
            "spain": {"country": "SPAIN", "location": "Barcelona", "gp": "Spanish Grand Prix", "flag": "Spain.svg"},
            "barcelona-catalunya": {"country": "SPAIN", "location": "Barcelona", "gp": "Spanish Grand Prix", "flag": "Spain.svg"},
            "canada": {"country": "CANADA", "location": "Montreal", "gp": "Canadian Grand Prix", "flag": "Canada.svg"},
            "austria": {"country": "AUSTRIA", "location": "Spielberg", "gp": "Austrian Grand Prix", "flag": "Austria.svg"},
            "great-britain": {"country": "UNITED KINGDOM", "location": "Silverstone", "gp": "British Grand Prix", "flag": "Great_Britain.svg"},
            "belgium": {"country": "BELGIUM", "location": "Spa-Francorchamps", "gp": "Belgian Grand Prix", "flag": "Belgium.svg"},
            "hungary": {"country": "HUNGARY", "location": "Budapest", "gp": "Hungarian Grand Prix", "flag": "Hungary.svg"},
            "netherlands": {"country": "NETHERLANDS", "location": "Zandvoort", "gp": "Dutch Grand Prix", "flag": "Netherlands.svg"},
            "italy": {"country": "ITALY", "location": "Monza", "gp": "Italian Grand Prix", "flag": "Italy.svg"},
            "azerbaijan": {"country": "AZERBAIJAN", "location": "Baku", "gp": "Azerbaijan Grand Prix", "flag": "Azerbaijan.svg"},
            "singapore": {"country": "SINGAPORE", "location": "Singapore", "gp": "Singapore Grand Prix", "flag": "Singapore.svg"},
            "united-states": {"country": "USA", "location": "Austin", "gp": "United States Grand Prix", "flag": "USA.svg"},
            "mexico": {"country": "MEXICO", "location": "Mexico City", "gp": "Mexico City Grand Prix", "flag": "Mexico.svg"},
            "brazil": {"country": "BRAZIL", "location": "Sao Paulo", "gp": "Sao Paulo Grand Prix", "flag": "Brazil.svg"},
            "las-vegas": {"country": "USA", "location": "Las Vegas", "gp": "Las Vegas Grand Prix", "flag": "USA.svg"},
            "qatar": {"country": "QATAR", "location": "Lusail", "gp": "Qatar Grand Prix", "flag": "Qatar.svg"},
            "united-arab-emirates": {"country": "UAE", "location": "Yas Marina", "gp": "Abu Dhabi Grand Prix", "file_slug": "abu-dhabi", "flag": "UAE.svg"},
        }

        # 加载静态赛道参数 metadata
        self.circuit_metadata = {}
        try:
            with open('config/circuit_metadata.json', 'r', encoding='utf-8') as f:
                self.circuit_metadata = json.load(f)
        except:
            print("Warning: circuit_metadata.json not found, using empty metadata")

    def save_data(self, data, filename):
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Data saved to {filename}")

    def _reconstruct_next_data(self, html):
        pattern = r'self\.__next_f\.push\(\[1,\"(.*?)\"\]\)'
        matches = re.findall(pattern, html)
        full_text = "".join(matches).replace('\\"', '"').replace('\\\\', '\\')
        return full_text

    def fetch_page(self, url, max_retries=3):
        for i in range(max_retries):
            try:
                print(f"Fetching: {url} (Attempt {i+1})")
                response = requests.get(url, headers=self.headers, timeout=15)
                response.raise_for_status()
                return response.text
            except Exception as e:
                print(f"Request failed: {e}")
                time.sleep(2)
        return None

    def get_schedule(self):
        url = f"{self.base_url}/en/racing/{self.season}"
        html = self.fetch_page(url)
        if not html: return []

        schedule = []
        
        try:
            full_text = self._reconstruct_next_data(html)
            start_tag = '"secondaryNavigationSchedule":['
            start_idx = full_text.find(start_tag)
            if start_idx != -1:
                content = full_text[start_idx + len(start_tag) - 1:]
                brace_count, end_idx = 0, 0
                for i, char in enumerate(content):
                    if char == '[': brace_count += 1
                    elif char == ']': brace_count -= 1
                    if brace_count == 0:
                        end_idx = i + 1
                        break
                data = json.loads(content[:end_idx])
                for item in data:
                    slug = item.get("meetingKey", "").lower()
                    if not slug: 
                        slug = item.get("url", "").split('/')[-1]
                    
                    config = self.SEASON_2026_CONFIG.get(slug, {})
                    file_slug = config.get("file_slug", slug)
                    flag_file = config.get("flag", f"{item.get('countryDescription', '').title()}.svg")
                    specs = self.circuit_metadata.get(file_slug) or self.circuit_metadata.get(slug) or {}

                    schedule.append({
                        "round": item.get("roundText"),
                        "roundNumber": int(item.get("roundNumber", 0)),
                        "country": item.get("countryDescription", "").upper(),
                        "gpName": item.get("meetingName", ""),
                        "location": item.get("circuitShortName", ""),
                        "dates": item.get("startAndEndDateForF1RD"),
                        "slug": slug,
                        "image": f"/photos/seasons/{self.season}/tracks/{file_slug}_outline.svg",
                        "detailedImage": f"/photos/seasons/{self.season}/tracks/{file_slug}_detailed.webp",
                        "flag": f"/photos/seasons/flags/{flag_file}",
                        "url": f"{self.base_url}{item.get('url')}" if item.get('url') else None,
                        "sessions": item.get("sessionTimes", []),
                        "circuitSpecs": specs
                    })
        except Exception as e:
            print(f"Level 1 sync failed: {e}")

        if len(schedule) < 20:
            print(f"Detected low count ({len(schedule)}), fallback to HTML scraping...")
            soup = BeautifulSoup(html, 'html.parser')
            cards = soup.find_all('a', href=re.compile(rf'/en/racing/{self.season}/'))
            
            html_schedule = []
            seen_slugs = set()
            
            for card in cards:
                href = card.get('href', '')
                slug = href.split('/')[-1]
                if slug in [str(self.season), 'Schedule', 'testing'] or 'testing' in slug or slug in seen_slugs:
                    continue
                
                text_parts = card.get_text(separator='|', strip=True).split('|')
                
                round_str = "ROUND 0"
                date_str = ""
                location_str = ""
                
                for p in text_parts:
                    if p.startswith('ROUND'): round_str = p
                    elif re.search(r'\d+\s+-\s+\d+\s+[A-Z]{3}', p): date_str = p
                    elif any(p == v['location'] for v in self.SEASON_2026_CONFIG.values()):
                        location_str = p
                
                config = self.SEASON_2026_CONFIG.get(slug, {})
                country = config.get("country", "")
                gp_name = config.get("gp", "")
                location = location_str or config.get("location", "")
                file_slug = config.get("file_slug", slug)
                flag_file = config.get("flag", f"{country.title() if country else 'Unknown'}.svg")
                
                specs = self.circuit_metadata.get(file_slug) or self.circuit_metadata.get(slug) or {}
                
                html_schedule.append({
                    "round": round_str,
                    "roundNumber": int(round_str.split()[-1]) if ' ' in round_str else 0,
                    "country": country,
                    "gpName": gp_name,
                    "location": location,
                    "dates": date_str,
                    "slug": slug,
                    "image": f"/photos/seasons/{self.season}/tracks/{file_slug}_outline.svg",
                    "detailedImage": f"/photos/seasons/{self.season}/tracks/{file_slug}_detailed.webp",
                    "flag": f"/photos/seasons/flags/{flag_file}",
                    "url": f"{self.base_url}{href}",
                    "sessions": [],
                    "circuitSpecs": specs
                })
                seen_slugs.add(slug)
            
                schedule = sorted(html_schedule, key=lambda x: x['roundNumber'])

        # 为列表中的每个比赛补充具体时刻表
        print(f"Enriching {len(schedule)} events with session timetables...")
        for i, event in enumerate(schedule):
            if not event.get("sessions") and event.get("url"):
                print(f"[{i+1}/{len(schedule)}] Fetching sessions for {event['slug']}...")
                sessions, gmt_offset = self.fetch_sessions_for_race(event["url"])
                event["sessions"] = sessions
                if gmt_offset:
                    event["gmtOffset"] = gmt_offset
                time.sleep(0.5) # 礼貌延时

        return schedule

    def fetch_sessions_for_race(self, race_url):
        html = self.fetch_page(race_url)
        if not html: return [], None
        
        full_text = self._reconstruct_next_data(html)
        
        # 尝试抓取该分站的 gmtOffset
        gmt_match = re.search(r'\"gmtOffset\":\"([+-]\d{2}:\d{2})\"', full_text)
        gmt_offset = gmt_match.group(1) if gmt_match else None
        
        # 使用更精确的正则抓取会话信息
        pattern = r'\"description\":\"(Practice [123]|Qualifying|Race|Sprint Qualifying|Sprint|Grand Prix)\".*?\"startTime\":\"(.*?)\"'
        found = re.findall(pattern, full_text)
        
        sessions = []
        seen = set()
        for desc, start_time in found:
            # 归一化名称
            name = desc
            if desc == "Grand Prix": name = "Race"
            
            if name not in seen:
                # 如果有 gmtOffset 且 start_time 还没带 Z，则拼接上去
                final_time = start_time
                if gmt_offset and 'Z' not in start_time and '+' not in start_time and '-' not in start_time[10:]:
                    final_time = f"{start_time}{gmt_offset}"
                elif 'Z' not in start_time and not gmt_offset:
                    # 如果实在没有 offset，假设是 UTC (Z) 至少比变成用户本地时间强
                    final_time = f"{start_time}Z"
                
                sessions.append({
                    "name": name,
                    "time": final_time
                })
                seen.add(name)
        
        # 排序：P1 -> P2 -> P3 -> Qualy -> Race
        order = {"Practice 1": 1, "Practice 2": 2, "Practice 3": 3, "Sprint Qualifying": 4, "Sprint": 5, "Qualifying": 6, "Race": 7}
        sessions.sort(key=lambda x: order.get(x['name'], 99))
        
        return sessions, gmt_offset

    def get_race_results(self, url_or_html: str):
        if url_or_html.startswith('http'):
            html = self.fetch_page(url_or_html)
            if not html: return []
        else:
            html = url_or_html

        full_text = self._reconstruct_next_data(html)
        start_tag = '"rows":['
        start_idx = full_text.find(start_tag)
        if start_idx == -1: return []

        content = full_text[start_idx + len(start_tag) - 1:]
        brace_count, end_idx = 0, 0
        for i, char in enumerate(content):
            if char == '[': brace_count += 1
            elif char == ']': brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                break
        try:
            rows = json.loads(content[:end_idx])
            results = []
            for row in rows:
                results.append({
                    'pos':    row[0].get('content', [None])[0] if len(row) > 0 else None,
                    'no':     row[1].get('content', [None])[0] if len(row) > 1 else None,
                    'laps':   row[4].get('content', [None])[0] if len(row) > 4 else None,
                    'time':   row[5].get('content', [None])[0] if len(row) > 5 else None,
                    'points': row[6].get('content', [0])[0]    if len(row) > 6 else 0,
                })
            return results
        except:
            return []

if __name__ == "__main__":
    collector = F1DataCollector()
    print(f"Starting F1 Data Collector for Season {collector.season}...")
    
    schedule_file = f'data/schedule_{collector.season}.json'
    
    print("Executing sync...")
    sched = collector.get_schedule()
    if sched:
        collector.save_data(sched, schedule_file)
        print(f"Sync successful. Found {len(sched)} events.")
    else:
        print("Failed to sync schedule.")
