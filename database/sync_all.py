import json
import pyodbc
import os
from dotenv import load_dotenv

load_dotenv(r'd:\MyProject\DoAnCoSo\backend\.env')

def sync_all():
    json_path = r'd:\MyProject\DoAnCoSo\database\hanzi_data.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    radicals_list = data.get('radicals', [])
    characters_list = data.get('characters', [])
    
    conn = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=HanziEcosystem;Trusted_Connection=yes;')
    cursor = conn.cursor()
    
    # 1. Sync Radicals
    print("Syncing Radicals...")
    cursor.execute("SELECT character FROM Radicals")
    existing_rads = {row.character.strip() for row in cursor.fetchall()}
    
    rads_to_insert = []
    for rad in radicals_list:
        char = rad.get('label')
        if char and char not in existing_rads:
            rads_to_insert.append((
                char, 
                rad.get('pinyin'), 
                rad.get('meaning'),
                rad.get('variant'),
                1 # stroke count placeholder
            ))
            existing_rads.add(char)
            
    if rads_to_insert:
        cursor.executemany(
            "INSERT INTO Radicals (character, pinyin, meaning, variants, stroke_count) VALUES (?, ?, ?, ?, ?)",
            rads_to_insert
        )
        print(f"Inserted {len(rads_to_insert)} new radicals.")
    else:
        print("No new radicals to insert.")

    # 2. Sync Characters
    print("Syncing Characters...")
    cursor.execute("SELECT hanzi FROM Characters")
    existing_chars = {row.hanzi.strip() for row in cursor.fetchall()}
    
    inserted_count = 0
    for char in characters_list:
        hanzi = char.get('label')
        if not hanzi: continue
        
        # Check if exists in DB or already processed
        if hanzi not in existing_chars:
            try:
                cursor.execute(
                    "INSERT INTO Characters (hanzi, pinyin, explanation, hsk_level, stroke_count) VALUES (?, ?, ?, ?, ?)",
                    (hanzi, char.get('pinyin'), char.get('meaning'), 1, 1)
                )
                existing_chars.add(hanzi)
                inserted_count += 1
            except pyodbc.IntegrityError:
                # Still fails? Just skip.
                pass
            
    print(f"Inserted {inserted_count} new characters.")
    
    conn.commit()

    # 3. Sync Links (Re-run the link sync logic)
    print("Syncing Links...")
    cursor.execute("SELECT radical_id, character FROM Radicals")
    db_rad_map = {row.character.strip(): row.radical_id for row in cursor.fetchall()}
    cursor.execute("SELECT char_id, hanzi FROM Characters")
    db_char_map = {row.hanzi.strip(): row.char_id for row in cursor.fetchall()}
    
    json_rad_map = {r['id']: r['label'] for r in radicals_list}
    
    links_to_insert = []
    for char in characters_list:
        char_label = char.get('label')
        char_id = db_char_map.get(char_label)
        if not char_id: continue
        
        for rad_json_id in char.get('components', []):
            rad_label = json_rad_map.get(rad_json_id)
            rad_id = db_rad_map.get(rad_label)
            if rad_id:
                links_to_insert.append((char_id, rad_id))
    
    cursor.execute("DELETE FROM CharacterRadicalRel")
    if links_to_insert:
        cursor.executemany(
            "INSERT INTO CharacterRadicalRel (char_id, radical_id) VALUES (?, ?)",
            links_to_insert
        )
        print(f"Successfully synced {len(links_to_insert)} links.")
    
    conn.commit()
    conn.close()

if __name__ == "__main__":
    sync_all()
