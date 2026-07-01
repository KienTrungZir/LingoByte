import json
import pyodbc
import os
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../backend/.env")

DATABASE_URL = os.getenv("DATABASE_URL")

# Function to parse SQLAlchemy connection string for pyodbc
def get_pyodbc_connection_string(url):
    # Example: mssql+pyodbc://@localhost/HanziEcosystem?driver=ODBC+Driver+17+for+SQL+Server&Trusted_Connection=yes
    # We need to convert it to a standard pyodbc string
    conn_str = url.replace("mssql+pyodbc://", "")
    
    # Handle Trusted Connection
    if "Trusted_Connection=yes" in conn_str:
        server_db = conn_str.split("?")[0].replace("@", "")
        params = conn_str.split("?")[1]
        
        # Split server and database
        if "/" in server_db:
            server, database = server_db.split("/")
        else:
            server = server_db
            database = "master" # Default
            
        driver = "ODBC Driver 18 for SQL Server"
        return f"DRIVER={{{driver}}};SERVER={server};DATABASE={database};Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=yes"
    else:
        # For sa login: sa:password@server/database?driver=...
        # This is a bit more complex to parse but let's assume the user is using Trusted Connection as per my suggestion
        return url

def seed_data():
    hsk_json_path = r"D:\MyProject\HKS\hsk_data.json"
    
    if not os.path.exists(hsk_json_path):
        print(f"Error: {hsk_json_path} not found.")
        return

    print("Reading HSK data...")
    with open(hsk_json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    print(f"Connecting to database using: {DATABASE_URL}")
    try:
        conn_str = get_pyodbc_connection_string(DATABASE_URL)
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    # 1. Extract all unique single characters
    print("Extracting unique characters...")
    unique_chars = set()
    for entry in data:
        chinese = entry.get("chinese", "")
        for char in chinese:
            # Check if it's a Chinese character (range U+4E00 to U+9FFF)
            if '\u4e00' <= char <= '\u9fff':
                unique_chars.add(char)
    
    print(f"Found {len(unique_chars)} unique characters.")

    # 2. Insert characters into Characters table
    print("Seeding Characters table...")
    chars_added = 0
    for char in unique_chars:
        try:
            # We don't have pinyin/meaning for individual characters if they were parts of words,
            # but we can try to find them if the word itself was a single character.
            # For now, we'll just insert the hanzi.
            cursor.execute(
                "IF NOT EXISTS (SELECT 1 FROM Characters WHERE hanzi = ?) INSERT INTO Characters (hanzi) VALUES (?)",
                char, char
            )
            chars_added += 1
        except Exception as e:
            # Skip errors (e.g. duplicate from multi-threading or other issues)
            continue
    conn.commit()
    print(f"Characters table update finished.")

    # 3. Insert words into Vocabulary table
    print("Seeding Vocabulary table...")
    vocab_added = 0
    for entry in data:
        try:
            cursor.execute(
                "INSERT INTO Vocabulary (word, pinyin, meaning_en, hsk_level) VALUES (?, ?, ?, ?)",
                entry["chinese"], entry["pinyin"], entry["english"], entry["level"]
            )
            vocab_added += 1
        except Exception as e:
            print(f"Failed to insert word {entry['chinese']}: {e}")
    
    conn.commit()
    print(f"Vocabulary table update finished. Added {vocab_added} words.")

    conn.close()
    print("Done!")

if __name__ == "__main__":
    seed_data()
