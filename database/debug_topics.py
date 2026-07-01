import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
from backend.app.database import SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def debug_topics():
    with engine.connect() as conn:
        res = conn.execute(text("SELECT topic_id, title FROM Topics")).fetchall()
        for r in res:
            # Print as hex to see what's actually there
            title_hex = r.title.encode('utf-16').hex() if r.title else "None"
            print(f"ID: {r.topic_id} | Title: {title_hex}")

if __name__ == "__main__":
    debug_topics()
