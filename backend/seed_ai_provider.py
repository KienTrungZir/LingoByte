from app.database import engine, SessionLocal
from app import models
import os
from dotenv import load_dotenv
from app.services.ai_providers import AiProviderFactory

def seed_database():
    load_dotenv()

    print("Creating tables...")
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        existing = db.query(models.AiProviderSetting).first()
        if not existing:
            api_key = os.getenv("OPENROUTER_API_KEY")
            if api_key:
                encrypted_key = AiProviderFactory.encrypt(api_key)
                setting = models.AiProviderSetting(
                    provider="openrouter",
                    api_key=encrypted_key,
                    model="google/gemini-flash-1.5",
                    is_active=True,
                    updated_by="system_migration"
                )
                db.add(setting)
                db.commit()
                print("✅ Đã seed OpenRouter API key từ .env vào database.")
            else:
                print("⚠️ Không tìm thấy OPENROUTER_API_KEY trong .env để seed.")
        else:
            print("✅ Database đã có cấu hình AI Provider. Bỏ qua seeding.")
    except Exception as e:
        print(f"❌ Lỗi: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
