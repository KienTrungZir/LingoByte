from app.database import SessionLocal
from app.models import User
from app.auth import SECRET_KEY, ALGORITHM
from jose import jwt
import asyncio
from datetime import datetime

async def check_user_token():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJraWVuIiwiZXhwIjoxNzc4ODQwNjMzfQ.xhXv1lbV7pTSy8J2aHi-O_cqx5q-mOLf67M3EZS3l3w"
    print(f"Checking token...")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        exp = payload.get("exp")
        print(f"Username: {username}")
        print(f"Exp: {datetime.fromtimestamp(exp)}")
        
        db = SessionLocal()
        user = db.query(User).filter(User.username == username).first()
        if user:
            print(f"User found: {user.username} (ID: {user.user_id})")
        else:
            print("User NOT found in DB")
        db.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_user_token())
