import pyodbc
import os
import time
from dotenv import load_dotenv

# Try to import deep-translator, if not installed, we'll tell the user
try:
    from deep_translator import GoogleTranslator
except ImportError:
    print("Library 'deep-translator' not found. Please install it using:")
    print("pip install deep-translator")
    exit()

load_dotenv(dotenv_path="../backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    conn_str = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost;DATABASE=HanziEcosystem;Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=yes"
    return pyodbc.connect(conn_str)

def translate_all():
    conn = get_conn()
    cursor = conn.cursor()
    
    # Fetch words that haven't been translated yet
    cursor.execute("SELECT vocab_id, meaning_en FROM Vocabulary WHERE meaning_vi IS NULL")
    rows = cursor.fetchall()
    
    total = len(rows)
    print(f"Total words to translate: {total}")
    
    translator = GoogleTranslator(source='en', target='vi')
    
    count = 0
    for vocab_id, meaning_en in rows:
        if not meaning_en:
            continue
            
        try:
            # Clean up meaning_en (sometimes it has extra info)
            clean_en = meaning_en.split(';')[0].split('(')[0].strip()
            
            vietnamese = translator.translate(clean_en)
            
            cursor.execute("UPDATE Vocabulary SET meaning_vi = ? WHERE vocab_id = ?", vietnamese, vocab_id)
            count += 1
            
            if count % 10 == 0:
                conn.commit()
                print(f"Translated {count}/{total} words...")
            
            # Small delay to avoid rate limiting
            time.sleep(0.1)
            
        except Exception as e:
            print(f"Failed to translate {meaning_en}: {e}")
            continue
            
    conn.commit()
    conn.close()
    print(f"Finished! Successfully translated {count} words.")

if __name__ == "__main__":
    translate_all()
