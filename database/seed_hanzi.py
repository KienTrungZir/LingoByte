import json
import os
import pyodbc
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../backend/.env")

DATABASE_URL = os.getenv("DATABASE_URL")
# Handle pyodbc connection string if needed, or use sqlalchemy
# For simplicity and consistency with previous scripts, let's use pyodbc directly or sqlalchemy

engine = create_engine(DATABASE_URL)

def seed_data():
    with open("hanzi_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)

    with engine.begin() as conn:
        print("Seeding Radicals...")
        for rad in data["radicals"]:
            # Check if radical exists
            result = conn.execute(
                text("SELECT radical_id FROM Radicals WHERE character = :char"),
                {"char": rad["label"]}
            ).fetchone()
            
            if result:
                # Update existing
                conn.execute(
                    text("UPDATE Radicals SET pinyin = :pinyin, meaning = :meaning, variants = :variants WHERE character = :char"),
                    {
                        "pinyin": rad["pinyin"],
                        "meaning": rad["meaning"],
                        "variants": rad["variant"],
                        "char": rad["label"]
                    }
                )
            else:
                # Insert new
                conn.execute(
                    text("INSERT INTO Radicals (character, pinyin, meaning, variants) VALUES (:char, :pinyin, :meaning, :variants)"),
                    {
                        "char": rad["label"],
                        "pinyin": rad["pinyin"],
                        "meaning": rad["meaning"],
                        "variants": rad["variant"]
                    }
                )

        print("Seeding Characters...")
        for char in data["characters"]:
            # Check if character exists
            result = conn.execute(
                text("SELECT char_id FROM Characters WHERE hanzi = :char"),
                {"char": char["label"]}
            ).fetchone()
            
            if result:
                char_id = result[0]
                # Update
                conn.execute(
                    text("UPDATE Characters SET pinyin = :pinyin, meaning_vi = :meaning WHERE char_id = :id"),
                    {
                        "pinyin": char["pinyin"],
                        "meaning": char["meaning"],
                        "id": char_id
                    }
                )
            else:
                # Insert
                conn.execute(
                    text("INSERT INTO Characters (hanzi, pinyin, meaning_vi) VALUES (:char, :pinyin, :meaning)"),
                    {
                        "char": char["label"],
                        "pinyin": char["pinyin"],
                        "meaning": char["meaning"]
                    }
                )
                # Get the new ID
                char_id = conn.execute(text("SELECT @@IDENTITY")).fetchone()[0]

            # Link components (radicals)
            if "components" in char:
                for rad_id_str in char["components"]:
                    # Extract symbol from "rad-X"
                    rad_symbol = rad_id_str.split("-")[-1]
                    
                    # Find radical_id
                    rad_row = conn.execute(
                        text("SELECT radical_id FROM Radicals WHERE character = :char"),
                        {"char": rad_symbol}
                    ).fetchone()
                    
                    if rad_row:
                        rad_id = rad_row[0]
                        # Check if relation exists
                        rel_exists = conn.execute(
                            text("SELECT 1 FROM CharacterRadicalRel WHERE char_id = :cid AND radical_id = :rid"),
                            {"cid": char_id, "rid": rad_id}
                        ).fetchone()
                        
                        if not rel_exists:
                            conn.execute(
                                text("INSERT INTO CharacterRadicalRel (char_id, radical_id) VALUES (:cid, :rid)"),
                                {"cid": char_id, "rid": rad_id}
                            )

    print("Seeding completed successfully.")

if __name__ == "__main__":
    seed_data()
