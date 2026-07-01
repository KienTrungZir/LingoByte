"""
AI Chat API for LingoByte
Upgraded with:
- Multi-provider AI support (Gemini, Claude, OpenAI, OpenRouter)
- Provider Factory pattern (inspired by HanVira)
- Full conversation context (history)
- Chinese tutor system prompt
- Session analysis after 5 turns
- Resiliency with fallback responses
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user
from ..services.ai_providers import AiProviderFactory

router = APIRouter(
    prefix="/chat",
    tags=["chat"]
)

# --- System Prompt for Chinese Tutor ---
SYSTEM_PROMPT = """Bạn là Lǎo Shī (老师), gia sư tiếng Trung của LingoByte. 

NGUYÊN TẮC:
- Bạn dạy tiếng Trung cho người Việt. Giải thích bằng tiếng Việt, pha trộn tiếng Trung.
- Mỗi lượt, hãy: (1) Phản hồi câu trả lời trước, (2) Dạy 1-2 từ mới hoặc ngữ pháp, (3) Đặt câu hỏi hoặc bài tập mới.
- Dùng Pinyin kèm Hán tự. Ví dụ: 你好 (nǐ hǎo)
- Khuyến khích và khen ngợi khi học sinh trả lời đúng.
- Sửa lỗi nhẹ nhàng nếu có.
- Giữ cuộc hội thoại tự nhiên, vui vẻ, không quá academic.
- Trả lời ngắn gọn (3-5 câu), dễ hiểu.
- Nếu đây là lượt đầu hoặc không có lịch sử, hãy chào đón và bắt đầu với câu hỏi đơn giản."""

ANALYSIS_PROMPT = """Bạn là chuyên gia đánh giá ngôn ngữ của LingoByte. Hãy phân tích cuộc hội thoại luyện tiếng Trung dưới đây và đánh giá học sinh theo các tiêu chí:

1. **Phát âm & Pinyin** (0-100): Mức độ chính xác khi sử dụng pinyin và từ vựng tiếng Trung
2. **Ngữ pháp** (0-100): Cấu trúc câu, trật tự từ
3. **Từ vựng** (0-100): Đa dạng và chính xác trong sử dụng từ
4. **Giao tiếp** (0-100): Khả năng trả lời đúng ngữ cảnh, mạch lạc
5. **Tổng thể** (0-100): Đánh giá chung

Hãy trả về dưới dạng JSON:
```json
{
  "scores": {
    "pronunciation": <number>,
    "grammar": <number>,
    "vocabulary": <number>,
    "communication": <number>,
    "overall": <number>
  },
  "summary": "<tóm tắt 2-3 câu bằng tiếng Việt>",
  "strengths": ["<điểm mạnh 1>", "<điểm mạnh 2>"],
  "improvements": ["<cần cải thiện 1>", "<cần cải thiện 2>"],
  "words_learned": ["<từ mới 1>", "<từ mới 2>", ...],
  "next_suggestion": "<gợi ý cho buổi học tiếp theo>"
}
```

Chỉ trả về JSON, không thêm text nào khác."""

FALLBACK_RESPONSES = [
    "Xin lỗi, hệ thống AI đang bận. Trong lúc chờ, bạn hãy thử nói: 你好！(nǐ hǎo) - Xin chào!",
    "AI tạm gián đoạn. Bạn ôn lại: 我很好 (wǒ hěn hǎo) - Tôi rất khỏe! 加油！(jiā yóu) - Cố lên!",
    "Chờ chút nhé! Thử câu này: 谢谢老师 (xiè xie lǎo shī) - Cảm ơn thầy/cô!",
]


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
            print(f"[Chat AI] Success: Response from {provider.provider_name}")
        return result
    except ValueError as e:
        print(f"[Chat AI] Provider Config Error: {e}")
        return None
    except Exception as e:
        print(f"[Chat AI] Error: {e}")
        return None


@router.get("/history", response_model=List[schemas.ChatMessage])
def get_chat_history(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.ChatMessage).filter(
        models.ChatMessage.user_id == current_user.user_id
    ).order_by(models.ChatMessage.created_at.asc()).all()


@router.post("/send", response_model=schemas.ChatMessage)
async def send_message(
    message: schemas.ChatMessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Save user message
    user_msg = models.ChatMessage(
        content=message.content,
        role="user",
        user_id=current_user.user_id
    )
    db.add(user_msg)
    db.flush()
    
    # 2. Build full conversation context with history
    history = db.query(models.ChatMessage).filter(
        models.ChatMessage.user_id == current_user.user_id
    ).order_by(models.ChatMessage.created_at.asc()).all()
    
    payload = [{"role": "system", "content": SYSTEM_PROMPT}]
    
    # Add last 10 messages for context
    for msg in history[-10:]:
        payload.append({"role": msg.role, "content": msg.content})
    
    # 3. Call AI with full context
    ai_content = await _call_ai(payload, db=db)
    
    # 4. Fallback if AI fails (Resiliency Engine)
    if not ai_content:
        turn_count = sum(1 for m in history if m.role == "user")
        ai_content = FALLBACK_RESPONSES[turn_count % len(FALLBACK_RESPONSES)]

    # 5. Save AI response
    ai_msg = models.ChatMessage(
        content=ai_content,
        role="assistant",
        user_id=current_user.user_id
    )
    db.add(ai_msg)
    
    db.commit()
    db.refresh(ai_msg)
    return ai_msg


@router.post("/analyze")
async def analyze_session(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Analyze the conversation session and provide scores.
    Called after 5 turns or when user ends the session.
    """
    # Get all messages
    history = db.query(models.ChatMessage).filter(
        models.ChatMessage.user_id == current_user.user_id
    ).order_by(models.ChatMessage.created_at.asc()).all()
    
    if len(history) < 2:
        raise HTTPException(status_code=400, detail="Not enough conversation to analyze")
    
    # Build analysis payload
    conversation_text = "\n".join([
        f"{'Học sinh' if m.role == 'user' else 'Gia sư'}: {m.content}" 
        for m in history[-12:]  # Last 12 messages (6 turns)
    ])
    
    payload = [
        {"role": "system", "content": ANALYSIS_PROMPT},
        {"role": "user", "content": f"Cuộc hội thoại cần phân tích:\n\n{conversation_text}"}
    ]
    
    result = await _call_ai(payload, db=db, timeout=45.0)
    
    if not result:
        # Fallback analysis
        return {
            "scores": {
                "pronunciation": 70,
                "grammar": 65,
                "vocabulary": 60,
                "communication": 75,
                "overall": 68
            },
            "summary": "Bạn đã hoàn thành buổi luyện tập! Hệ thống AI tạm thời không thể phân tích chi tiết. Hãy tiếp tục luyện tập nhé!",
            "strengths": ["Tích cực tham gia", "Hoàn thành bài luyện"],
            "improvements": ["Tiếp tục luyện phát âm", "Mở rộng từ vựng"],
            "words_learned": [],
            "next_suggestion": "Thử luyện tập với chủ đề Gia đình hoặc Ẩm thực"
        }
    
    # Parse JSON response from AI
    import json
    try:
        # Clean up AI response - remove markdown code blocks if present
        cleaned = result.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        
        analysis = json.loads(cleaned.strip())
        return analysis
    except json.JSONDecodeError:
        # If AI didn't return valid JSON, return the text as summary
        return {
            "scores": {
                "pronunciation": 70,
                "grammar": 70,
                "vocabulary": 70,
                "communication": 75,
                "overall": 71
            },
            "summary": result[:200],
            "strengths": ["Hoàn thành buổi luyện tập"],
            "improvements": ["Tiếp tục luyện tập thường xuyên"],
            "words_learned": [],
            "next_suggestion": "Tiếp tục với bài học tiếp theo"
        }


@router.delete("/clear")
def clear_chat_history(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Clear all chat history for current user (start new session)."""
    db.query(models.ChatMessage).filter(
        models.ChatMessage.user_id == current_user.user_id
    ).delete()
    db.commit()
    return {"status": "cleared"}
