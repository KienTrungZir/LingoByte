from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from . import models, schemas, auth
from .database import get_db

async def get_current_user(db: Session = Depends(get_db), token: str = Depends(auth.oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # print(f"DEBUG: Validating token: {token[:20]}...")
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            print("DEBUG: No username in payload")
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError as e:
        print(f"DEBUG: JWT Decode Error: {e}")
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.username == token_data.username).first()
    if user is None:
        print(f"DEBUG: User '{token_data.username}' not found in DB")
        raise credentials_exception
    # print(f"DEBUG: User '{user.username}' authenticated successfully")
    return user

async def get_current_user_from_token(token: str):
    from .database import SessionLocal
    db = SessionLocal()
    try:
        payload = jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            print("DEBUG WS: No username in payload")
            raise Exception("Invalid token")
        user = db.query(models.User).filter(models.User.username == username).first()
        if user is None:
            print(f"DEBUG WS: User '{username}' not found in DB")
            raise Exception("User not found")
        return user
    except Exception as e:
        print(f"DEBUG WS: Auth Error: {e}")
        raise e
    finally:
        db.close()
