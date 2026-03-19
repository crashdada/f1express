with open('full_raw_next.txt', 'r', encoding='utf-8') as f:
    text = f.read()

import re
# Find all occurrences of ROUND X
matches = list(re.finditer(r'ROUND (\d+)', text))

for i in range(len(matches)):
    start = matches[i].end()
    end = matches[i+1].start() if i+1 < len(matches) else start + 5000
    
    # Text between rounds often contains the GP name and location
    chunk = text[start : end]
    # Look for dates
    date_match = re.search(r'(\d+\s+-\s+\d+\s+[A-Z]{3})', chunk)
    date = date_match.group(1) if date_match else "N/A"
    
    # Look for slugs
    slug_match = re.search(r'/en/racing/2026/([a-zA-Z0-9-]+)', chunk)
    slug = slug_match.group(1) if slug_match else "N/A"
    
    print(f"Round {matches[i].group(1)}: Slug={slug}, Date={date}, Chunk preview: {chunk[:100]}...")
