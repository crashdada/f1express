import re
with open('australia_next.txt', 'r', encoding='utf-8') as f:
    for line in f:
        # F1 Next.js data is often one big blob or many pushes
        # Check for gmtOffset or similar
        m = re.findall(r'\"([a-zA-Z]*Offset|timezone|gmt)\":\"(.*?)\"', line, re.I)
        if m:
            print(f"Found: {m}")
        
        # Also check for values that look like +11:00 or similar
        m2 = re.findall(r'\"[a-zA-Z]*\":\"([+-]\d{2}:\d{2})\"', line)
        if m2:
            print(f"Candidate offsets: {m2}")
