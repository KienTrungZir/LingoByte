import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# SQL Server connection string
# Format: mssql+pyodbc://[user]:[password]@[server]/[database]?driver=ODBC+Driver+17+for+SQL+Server
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "mssql+pyodbc://sa:YourPassword@localhost/HanziEcosystem?driver=ODBC+Driver+17+for+SQL+Server")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
