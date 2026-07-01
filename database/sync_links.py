import json
import pyodbc
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(r'd:\MyProject\DoAnCoSo\backend\.env')

def sync_links():
    # 1. Load JSON data
    json_path = r'd:\MyProject\DoAnCoSo\database\hanzi_data.json'
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    radicals_list = data.get('radicals', [])
    characters_list = data.get('characters', [])
    
    # 2. Extract radicals and characters from JSON
    json_radicals = {} # id -> label
    json_characters = [] # list of (label, components)
    
    for item in radicals_list:
        item_id = item.get('id', '')
        label = item.get('label', '')
        if item_id.startswith('rad-'):
            json_radicals[item_id] = label
            
    for item in characters_list:
        label = item.get('label', '')
        json_characters.append((label, item.get('components', [])))
            
    print(f"JSON: Found {len(json_radicals)} radicals and {len(json_characters)} characters.")

    # 3. Connect to Database
    conn = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=localhost;DATABASE=HanziEcosystem;Trusted_Connection=yes;')
    cursor = conn.cursor()
    
    # 4. Get DB Radical Map (character -> radical_id)
    cursor.execute("SELECT radical_id, character FROM Radicals")
    db_rad_map = {row.character.strip(): row.radical_id for row in cursor.fetchall()}
    print(f"DB: Found {len(db_rad_map)} radicals.")
    
    # 5. Get DB Character Map (hanzi -> char_id)
    cursor.execute("SELECT char_id, hanzi FROM Characters")
    db_char_map = {row.hanzi.strip(): row.char_id for row in cursor.fetchall()}
    print(f"DB: Found {len(db_char_map)} characters.")
    
    # 6. Prepare Relationships
    links_to_insert = []
    missing_rads = set()
    missing_chars = set()
    
    for char_label, components in json_characters:
        if char_label not in db_char_map:
            missing_chars.add(char_label)
            continue
            
        char_id = db_char_map[char_label]
        
        for rad_id_in_json in components:
            rad_label = json_radicals.get(rad_id_in_json)
            if not rad_label:
                continue
                
            if rad_label not in db_rad_map:
                missing_rads.add(rad_label)
                continue
                
            rad_id = db_rad_map[rad_label]
            links_to_insert.append((char_id, rad_id))
            
    print(f"Prepared {len(links_to_insert)} links.")
    if missing_rads:
        print(f"Missing radicals in DB: {len(missing_rads)}")
    if missing_chars:
        print(f"Missing characters in DB: {len(missing_chars)}")
        
    # 7. Clear old links and Insert new ones
    print("Clearing old links...")
    cursor.execute("DELETE FROM CharacterRadicalRel")
    
    print("Inserting new links...")
    # Use executemany for efficiency
    try:
        cursor.executemany(
            "INSERT INTO CharacterRadicalRel (char_id, radical_id) VALUES (?, ?)",
            links_to_insert
        )
        conn.commit()
        print(f"Successfully inserted {len(links_to_insert)} links.")
    except Exception as e:
        print(f"Error during insertion: {e}")
        conn.rollback()
        
    conn.close()

if __name__ == "__main__":
    sync_links()
