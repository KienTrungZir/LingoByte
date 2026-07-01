import sys
import pyodbc
from pypinyin import pinyin, Style
import re

conn_str = "DRIVER={ODBC Driver 18 for SQL Server};SERVER=localhost;DATABASE=HanziEcosystem;Trusted_Connection=yes;Encrypt=yes;TrustServerCertificate=yes"
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

cursor.execute("SELECT vocab_id, word, pinyin, meaning_en FROM Vocabulary")
rows = cursor.fetchall()

updated = 0

def clean_english(word, old_pinyin_col, old_en_col):
    # Combine old fields
    raw_pinyin = (old_pinyin_col or "").strip()
    raw_en = (old_en_col or "").strip()
    combined = f"{raw_pinyin} {raw_en}".strip()
    
    # We want to remove the pinyin from the beginning of `combined`.
    # Pinyin syllables for the word:
    syllables = [p[0] for p in pinyin(word, style=Style.NORMAL)]
    
    # We will build a regex to match these syllables at the start of the string, 
    # optionally with tone marks or numbers, and optionally joined or separated by spaces.
    # To keep it simple, we just find the first character in `combined` that doesn't belong to the pinyin.
    # A robust way: Convert combined to lowercase, remove tone marks, and match the syllables.
    import unicodedata
    def remove_accents(input_str):
        nfkd_form = unicodedata.normalize('NFKD', input_str)
        return u"".join([c for c in nfkd_form if not unicodedata.combining(c)])

    cleaned_combined = remove_accents(combined).lower()
    
    # Pinyin without tones
    pinyin_no_tones = "".join(syllables).lower().replace("u:", "v")
    
    # Let's just find the first English word.
    # Common english pronouns/words that appear right after pinyin in this dataset:
    eng_markers = [" I", " me", " you", " he", " him", " she", " her", " we", " us", " they", " them", " it", " this", " that", " which", " who", " what", " where", " when", " why", " how", " a ", " an ", " the ", " to ", " in ", " on ", " at ", " pl.", " adj", " noun", " verb", " adv", " prep"]
    
    # If the combined string has any of these markers, we split there.
    # First, let's try a generic approach: split combined by space.
    tokens = combined.split()
    
    if not tokens:
        return ""
        
    # We drop the first token if it looks like the pinyin (i.e. starts with the same letter as the first pinyin syllable)
    if len(syllables) > 0 and len(tokens) > 0:
        first_syl = syllables[0].lower()
        first_tok_clean = remove_accents(tokens[0]).lower()
        
        # If the first token contains the first syllable (or vice versa), it's likely the pinyin.
        if first_tok_clean.startswith(first_syl[:2]) or first_syl.startswith(first_tok_clean[:2]):
            # It's pinyin, remove it.
            tokens = tokens[1:]
            
            # Sometimes pinyin is split into multiple tokens in the combined string
            # e.g., "shen me what" -> "shen", "me", "what"
            # We can also check the second token.
            if len(syllables) > 1 and len(tokens) > 0:
                sec_syl = syllables[1].lower()
                sec_tok_clean = remove_accents(tokens[0]).lower()
                if sec_tok_clean.startswith(sec_syl[:2]) or sec_syl.startswith(sec_tok_clean[:2]):
                    # It's the second part of pinyin, remove it.
                    tokens = tokens[1:]
                    
    # Rejoin the remaining tokens as the English meaning
    return " ".join(tokens)

for row in rows:
    vocab_id, word, old_pinyin, old_meaning_en = row
    
    # Generate correct Pinyin
    correct_pinyin = " ".join([p[0] for p in pinyin(word, style=Style.TONE)])
    
    # Clean up English meaning
    correct_english = clean_english(word, old_pinyin, old_meaning_en)
    
    # Avoid updating if nothing changed to save time, but here we just update all
    cursor.execute("UPDATE Vocabulary SET pinyin = ?, meaning_en = ? WHERE vocab_id = ?", correct_pinyin, correct_english, vocab_id)
    updated += 1

conn.commit()
conn.close()
print(f"Fixed {updated} words in Dictionary!")
