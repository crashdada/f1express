import pandas as pd
import requests
import sqlite3
import os

def main():
    print("Fetching Ferrari's season history from StatsF1...")
    url = "https://www.statsf1.com/en/ferrari.aspx"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (HTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch {url} (Status: {response.status_code})")
        return

    # Use pandas to extract tables
    tables = pd.read_html(response.text)
    
    # Find the table that likely contains season stats (Year, Grand Prix, Win, Pole, Points, etc.)
    target_table = None
    for t in tables:
        if 'Year' in t.columns or 'Season' in t.columns or any('pts' in str(c).lower() for c in t.columns):
            # Try to identify the correct table
            if 'Year' in t.columns and 'pts' in t.columns:
                target_table = t
                break

    if target_table is None:
        # Sometimes StatsF1 headers are empty or different
        for t in tables:
            if len(t.columns) > 5 and '1950' in str(t.values):
                target_table = t
                break

    if target_table is None:
        print("Could not find the stats table on StatsF1.")
        return

    print("Found table, columns:", target_table.columns)
    
    # Save the table for debugging
    target_table.to_csv("statsf1_ferrari.csv", index=False)
    print("Table saved to statsf1_ferrari.csv. Now going to connect to local DB and compare...")

if __name__ == "__main__":
    main()
