import requests
import re
import json

def get_sessions(slug):
    url = f"https://www.formula1.com/en/racing/2026/{slug}"
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers)
    
    # Search for session-like data in Next.js blobs
    # Looking for "timetables" or "session"
    
    pattern = r'self\.__next_f\.push\(\[1,\"(.*?)\"\]\)'
    matches = re.findall(pattern, resp.text)
    full_text = "".join(matches).replace('\\"', '"').replace('\\\\', '\\')
    
    # Try to find a list of sessions
    # Usually it looks like: {"description":"Practice 1","startTime":"2026-03-06T01:30:00.000Z",...}
    
    sessions = []
    # Broad search for objects with description and startTime
    session_pattern = r'\{"description":"(Practice [123]|Qualifying|Race|Sprint Qualifying|Sprint)","startTime":"(.*?)"\}'
    found = re.findall(session_pattern, full_text)
    
    for desc, start_time in found:
        sessions.append({
            "name": desc,
            "time": start_time
        })
    
    return sessions

print(f"Sessions for Australia: {get_sessions('australia')}")
