from app.database import SessionLocal
from app.models import User

def set_admin(username):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).first()
        if user:
            user.role_id = 1
            db.commit()
            print(f"User '{username}' is now an Admin!")
        else:
            print(f"User '{username}' not found.")
    finally:
        db.close()

if __name__ == "__main__":
    set_admin("antigravity")
