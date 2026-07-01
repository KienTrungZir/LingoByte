import pyodbc
import os
import re
from dotenv import load_dotenv
from sqlalchemy import make_url

load_dotenv(dotenv_path="../backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")

url = make_url(DATABASE_URL)
driver = url.query.get("driver")
trusted = url.query.get("Trusted_Connection")
database = url.database
host = url.host
conn_str = f"DRIVER={{{driver}}};SERVER={host};DATABASE={database};Trusted_Connection={trusted}"

def clean_pinyin():
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    print("Cleaning Pinyin field in Vocabulary table...")
    
    # Fetch all records with pinyin
    cursor.execute("SELECT vocab_id, pinyin FROM Vocabulary WHERE pinyin IS NOT NULL")
    rows = cursor.fetchall()
    
    updated = 0
    for row in rows:
        vocab_id, pinyin = row
        # Often pinyin with english looks like "wǒ I; me"
        # We want to keep only the pinyin part.
        # Pinyin usually uses letters and tone marks (āáǎà, etc.)
        # A simple heuristic: everything before the first space or semicolon that isn't pinyin
        # Or better: remove common english words or characters
        
        # Regex to match common pinyin characters (including tones)
        # a-z plus tone marks: āáǎà ēéěè īíǐì ōóǒò ūúǔù ǖǘǚǜ
        pinyin_pattern = r'^[a-z1-5ü\sāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ:,]+'
        match = re.match(pinyin_pattern, pinyin, re.IGNORECASE)
        
        if match:
            cleaned = match.group(0).strip()
            # If cleaned is different from original, update
            if cleaned != pinyin.strip():
                # Also check if the remaining part was actually the meaning
                meaning_part = pinyin[len(cleaned):].strip().lstrip(';').strip()
                
                # If meaning_part is not empty, we might want to save it to meaning_en if meaning_en is null
                # But for now, let's just clean pinyin
                cursor.execute("UPDATE Vocabulary SET pinyin = ? WHERE vocab_id = ?", cleaned, vocab_id)
                updated += 1
                
    conn.commit()
    print(f"Successfully cleaned {updated} pinyin entries.")
    conn.close()

if __name__ == "__main__":
    clean_pinyin()
