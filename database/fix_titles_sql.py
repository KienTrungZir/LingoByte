import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
from backend.app.database import SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def fix_titles_sql():
    # Use SQL with N literals
    updates = [
        (13, "Chào hỏi"),
        (14, "Số đếm"),
        (15, "Gia đình"),
        (16, "Ẩm thực"),
        (17, "Thời gian"),
        (18, "Du lịch"),
        (19, "Mua sắm"),
        (20, "Cơ thể & Sức khỏe"),
        (21, "Công việc"),
        (22, "Thời tiết"),
        (23, "Cảm xúc & Tính cách"),
        (24, "Học tập")
    ]
    
    with engine.connect() as conn:
        for tid, title in updates:
            conn.execute(text(f"UPDATE Topics SET title = N'{title}' WHERE topic_id = {tid}"))
        conn.commit()
        print("Updated titles via SQL N literals.")

if __name__ == "__main__":
    fix_titles_sql()
