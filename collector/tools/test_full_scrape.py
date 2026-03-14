from bs4 import BeautifulSoup
import re
import json

def get_schedule_from_html(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    schedule = []
    # Find all race cards. In F1 2026 page, they are 'a' tags with specific classes.
    # We found them in trace_link_tags.py: Class 'group/schedule-card'
    cards = soup.find_all('a', href=re.compile(r'/en/racing/2026/'))
    
    seen_slugs = set()
    
    for card in cards:
        href = card.get('href', '')
        slug = href.split('/')[-1]
        
        if slug in ['2026', 'Schedule', 'testing'] or 'testing' in slug or slug in seen_slugs:
            continue
        
        # Extract details
        # Structure found in trace_link_tags: 
        # Inside the card, there are spans with 'ROUND X', 'Australia', etc.
        text = card.get_text(separator='|', strip=True)
        parts = text.split('|')
        
        # Example: ['ROUND 1', 'Australia', '06 - 08 MAR', ...]
        round_text = ""
        location = ""
        dates = ""
        gp_name = ""
        
        for p in parts:
            if p.startswith('ROUND'):
                round_text = p
            elif re.search(r'\d+\s+-\s+\d+\s+[A-Z]{3}', p):
                dates = p
        
        # Location and GP Name are a bit trickier as they are just text
        # Usually location is the first short text part after ROUND
        # GP Name is the longer one.
        
        schedule.append({
            "round": round_text,
            "roundNumber": int(round_text.split()[-1]) if round_text and round_text.split()[-1].isdigit() else 0,
            "country": "", # Will fill later
            "gpName": "", # Will fill later
            "location": location,
            "dates": dates,
            "slug": slug,
            "url": f"https://www.formula1.com{href}"
        })
        seen_slugs.add(slug)
    
    return schedule

sched = get_schedule_from_html('f1_2026.html')
print(f"Found {len(sched)} races")
for s in sched:
    print(s)
