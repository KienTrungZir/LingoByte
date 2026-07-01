from app.database import SessionLocal
from app.models import User
from app.auth import SECRET_KEY, ALGORITHM
from jose import jwt
import asyncio

async def test_auth():
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJraWVuIiwiZXhwIjoxNzc4ODM5NTQwfQ.NXImWTlYX95KdYUjoRTcEoiw5_AZ_mtYn7rYjA4njV8"
    print(f"Testing token for user: kien")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        print(f"Decoded username: {username}")
        
        db = SessionLocal()
        user = db.query(User).filter(User.username == username).first()
        if user:
            print(f"User found in DB: {user.username} (ID: {user.user_id})")
        else:
            print("User NOT found in DB")
        db.close()
    except Exception as e:
        print(f"Auth failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_auth())
