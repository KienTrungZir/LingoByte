import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
from backend.app.database import SQLALCHEMY_DATABASE_URL

engine = create_engine(SQLALCHEMY_DATABASE_URL)

def relink_lessons():
    with engine.connect() as conn:
        # Clear LessonItems
        conn.execute(text("DELETE FROM LessonItems"))
        
        # Link by Word and Topic Title
        # Chào hỏi
        conn.execute(text("INSERT INTO LessonItems (topic_id, vocab_id) SELECT (SELECT topic_id FROM Topics WHERE title = N'Chào hỏi'), vocab_id FROM Vocabulary WHERE word IN (N'你好', N'谢谢', N'对不起', N'再见', N'您好', N'没关系')"))
        # Số đếm
        conn.execute(text("INSERT INTO LessonItems (topic_id, vocab_id) SELECT (SELECT topic_id FROM Topics WHERE title = N'Số đếm'), vocab_id FROM Vocabulary WHERE word IN (N'一', N'二', N'三', N'四', N'五', N'六', N'七', N'八', N'九', N'十')"))
        # Gia đình
        conn.execute(text("INSERT INTO LessonItems (topic_id, vocab_id) SELECT (SELECT topic_id FROM Topics WHERE title = N'Gia đình'), vocab_id FROM Vocabulary WHERE word IN (N'爸爸', N'妈妈', N'哥哥', N'姐姐', N'弟弟', N'妹妹')"))
        
        conn.commit()
        print("Lesson items relinked successfully.")

if __name__ == "__main__":
    relink_lessons()
