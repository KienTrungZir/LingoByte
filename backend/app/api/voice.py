"""
Voice Processing API for LingoByte
Supports two engines:
  Engine 1 (Free): Frontend handles STT/TTS, backend receives text only
  Engine 2 (Premium): Backend uses OpenAI Whisper (STT) + TTS

AI responses now use the multi-provider system (via AiProviderFactory).
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..deps import get_current_user
from ..services.ai_providers import AiProviderFactory
import httpx
import os
import base64
import io
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/voice",
    tags=["voice"]
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# --- System Prompt for Chinese Tutor ---
SYSTEM_PROMPT = """Bạn là Lǎo Shī (老师), gia sư tiếng Trung của LingoByte. 

NGUYÊN TẮC:
- Bạn dạy tiếng Trung cho người Việt. Giải thích bằng tiếng Việt, pha trộn tiếng Trung.
- Mỗi lượt, hãy: (1) Phản hồi câu trả lời trước, (2) Dạy 1-2 từ mới hoặc ngữ pháp, (3) Đặt câu hỏi mới bằng tiếng Trung đơn giản.
- Dùng Pinyin kèm Hán tự. Ví dụ: 你好 (nǐ hǎo)
- Khuyến khích và khen ngợi khi học sinh trả lời đúng.
- Sửa lỗi nhẹ nhàng nếu có.
- Giữ cuộc hội thoại tự nhiên, vui vẻ, không quá academic.
- Nếu đây là lượt đầu, hãy chào đón và bắt đầu với câu hỏi đơn giản.
- Trả lời ngắn gọn (3-5 câu), dễ hiểu.

QUAN TRỌNG: Khi nhận được mã [END_SESSION] hoặc đã đủ 5 lượt hỏi đáp, hãy kết thúc bằng việc tổng kết ngắn gọn những gì đã học được."""

# --- Fallback responses when AI is down ---
FALLBACK_QUESTIONS = [
    "Xin lỗi, hệ thống AI đang bận. Hãy thử lại sau nhé! Trong lúc chờ, bạn thử nói: 你好 (nǐ hǎo) - Xin chào!",
    "AI tạm thời gián đoạn. Bạn hãy luyện câu: 我很好 (wǒ hěn hǎo) - Tôi rất khỏe!",
    "Hệ thống đang khôi phục. Hãy tập: 谢谢 (xiè xie) - Cảm ơn!",
    "Chờ một chút nhé! Bạn thử nói: 你叫什么名字？(nǐ jiào shénme míngzi?) - Bạn tên gì?",
    "AI sắp trở lại rồi! Trong lúc đó: 我是越南人 (wǒ shì yuènánrén) - Tôi là người Việt Nam."
]

def _get_fallback_response(turn_count: int) -> str:
    """Get a fallback response when AI is unavailable."""
    idx = turn_count % len(FALLBACK_QUESTIONS)
    return FALLBACK_QUESTIONS[idx]


async def _call_ai(messages_payload: list, db: Session = None, timeout: float = 30.0) -> str:
    """
    Call AI using the active provider from database.
    Uses AiProviderFactory to dynamically select provider.
    """
    try:
        provider = await AiProviderFactory.get_active(db)
        
        # Separate system prompt from conversation messages
        system_prompt = ""
        chat_messages = []
        for msg in messages_payload:
            if msg["role"] == "system":
                system_prompt = msg["content"]
            else:
                chat_messages.append(msg)
        
        result = await provider.send_message(chat_messages, system_prompt)
        if result:
            print(f"[Voice AI] Success: Response from {provider.provider_name}")
        return result
    except ValueError as e:
        print(f"[Voice AI] Provider Config Error: {e}")
        return None
    except Exception as e:
        print(f"[Voice AI] Error: {e}")
        return None


async def _whisper_stt(audio_bytes: bytes) -> str:
    """Use OpenAI Whisper to transcribe audio to text."""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                },
                files={
                    "file": ("audio.webm", audio_bytes, "audio/webm"),
                },
                data={
                    "model": "whisper-1",
                    "language": "zh",  # Hint: Chinese
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("text", "")
            elif response.status_code == 429:
                raise HTTPException(status_code=429, detail="OPENAI_LIMIT_REACHED")
            else:
                print(f"[Whisper] Error: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Whisper STT failed")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[Whisper] Connection Error: {e}")
        raise HTTPException(status_code=500, detail=f"Whisper connection error: {str(e)}")


async def _openai_tts(text: str, voice: str = "nova") -> str:
    """Use OpenAI TTS to generate speech, returns base64 encoded audio."""
    if not OPENAI_API_KEY:
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "tts-1",
                    "input": text[:4096],  # TTS limit
                    "voice": voice,
                    "response_format": "mp3",
                },
                timeout=30.0
            )
            
            if response.status_code == 200:
                audio_bytes = response.content
                return base64.b64encode(audio_bytes).decode('utf-8')
            elif response.status_code == 429:
                return "LIMIT_REACHED"
            else:
                print(f"[TTS] Error: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        print(f"[TTS] Connection Error: {e}")
        return None


def _build_conversation_payload(history_messages, new_user_text: str) -> list:
    """Build the full AI conversation payload with system prompt and history."""
    payload = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Add conversation history (last 10 messages to keep context manageable)
    for msg in history_messages[-10:]:
        payload.append({
            "role": msg.role,
            "content": msg.content
        })
    
    # Add new user message
    payload.append({"role": "user", "content": new_user_text})
    
    return payload


@router.post("/turn")
async def voice_turn(
    audio: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Premium Engine (Engine 2):
    Receives audio file → Whisper STT → AI response → TTS → return base64 audio + text
    """
    # 1. Read audio file
    audio_bytes = await audio.read()
    
    # 2. Whisper STT
    user_text = await _whisper_stt(audio_bytes)
    
    if not user_text.strip():
        return {
            "user_text": "",
            "ai_text": "Xin lỗi, tôi không nghe rõ. Bạn có thể nói lại không?",
            "audio_base64": None,
            "engine_warning": None
        }
    
    # 3. Save user message
    user_msg = models.ChatMessage(
        content=user_text,
        role="user",
        user_id=current_user.user_id,
        is_voice=True
    )
    db.add(user_msg)
    db.flush()
    
    # 4. Get conversation history
    history = db.query(models.ChatMessage).filter(
        models.ChatMessage.user_id == current_user.user_id
    ).order_by(models.ChatMessage.created_at.asc()).all()
    
    # Count turns for this session
    turn_count = sum(1 for m in history if m.role == "user") 
    
    # 5. Call AI
    payload = _build_conversation_payload(history[:-1], user_text)  # Exclude the just-added msg
    ai_text = await _call_ai(payload, db=db)
    
    if not ai_text:
        ai_text = _get_fallback_response(turn_count)
    
    # 6. Save AI response
    ai_msg = models.ChatMessage(
        content=ai_text,
        role="assistant",
        user_id=current_user.user_id,
        is_voice=True
    )
    db.add(ai_msg)
    db.commit()
    
    # 7. Generate TTS audio
    audio_base64 = await _openai_tts(ai_text)
    engine_warning = None
    
    if audio_base64 == "LIMIT_REACHED":
        engine_warning = "OPENAI_LIMIT_REACHED"
        audio_base64 = None
    
    return {
        "user_text": user_text,
        "ai_text": ai_text,
        "audio_base64": audio_base64,
        "engine_warning": engine_warning,
        "turn_count": turn_count
    }


@router.get("/check-premium")
async def check_premium_available():
    """Check if Premium Engine (OpenAI) is available."""
    has_key = bool(OPENAI_API_KEY and OPENAI_API_KEY.startswith("sk-"))
    return {"available": has_key}
