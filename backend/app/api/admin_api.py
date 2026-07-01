"""
Admin REST API endpoints for managing Topics, Characters, Vocabulary, Radicals, and LessonItems.
Supports bulk import (spreadsheet-style), search, and CRUD operations.
All endpoints require admin role (role_id == 1).
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user
from ..services.ai_providers import AiProviderFactory
from pydantic import BaseModel
from datetime import datetime


router = APIRouter(
    prefix="/api/admin",
    tags=["admin"]
)


# --- Pydantic models for Admin API ---

class TopicCreate(BaseModel):
    title: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    hsk_level: Optional[int] = None

class TopicUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    hsk_level: Optional[int] = None

class CharacterCreate(BaseModel):
    hanzi: str
    pinyin: Optional[str] = None
    meaning_vi: Optional[str] = None
    hsk_level: Optional[int] = None
    stroke_count: Optional[int] = None
    explanation: Optional[str] = None
    example_sentence: Optional[str] = None

class VocabularyCreate(BaseModel):
    word: str
    pinyin: Optional[str] = None
    meaning_vi: Optional[str] = None
    meaning_en: Optional[str] = None
    hsk_level: Optional[int] = None

class RadicalCreate(BaseModel):
    character: str
    pinyin: Optional[str] = None
    meaning: Optional[str] = None
    variants: Optional[str] = None
    stroke_count: Optional[int] = None
    mnemonic_tip: Optional[str] = None

class BulkCharacterItem(BaseModel):
    hanzi: str
    pinyin: Optional[str] = None
    meaning_vi: Optional[str] = None
    hsk_level: Optional[int] = None
    stroke_count: Optional[int] = None
    explanation: Optional[str] = None

class BulkVocabularyItem(BaseModel):
    word: str
    pinyin: Optional[str] = None
    meaning_vi: Optional[str] = None
    meaning_en: Optional[str] = None
    hsk_level: Optional[int] = None

class BulkRadicalItem(BaseModel):
    character: str
    pinyin: Optional[str] = None
    meaning: Optional[str] = None
    variants: Optional[str] = None
    stroke_count: Optional[int] = None

class BulkImportRequest(BaseModel):
    items: List[dict]

class LessonItemCreate(BaseModel):
    topic_id: int
    char_id: Optional[int] = None
    vocab_id: Optional[int] = None

class BulkLessonItemRequest(BaseModel):
    topic_id: int
    char_ids: List[int] = []
    vocab_ids: List[int] = []


# --- Admin guard ---

def require_admin(current_user: models.User = Depends(get_current_user)):
    if current_user.role_id != 1:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


# ===================== TOPICS =====================

@router.get("/topics")
def admin_list_topics(
    search: str = "",
    hsk_level: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    query = db.query(models.Topic)
    if search:
        query = query.filter(
            or_(
                models.Topic.title.contains(search),
                models.Topic.description.contains(search)
            )
        )
    if hsk_level is not None:
        query = query.filter(models.Topic.hsk_level == hsk_level)
    
    total = query.count()
    items = query.order_by(models.Topic.topic_id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for t in items:
        item_count = db.query(func.count(models.LessonItem.item_id)).filter(
            models.LessonItem.topic_id == t.topic_id
        ).scalar() or 0
        result.append({
            "topic_id": t.topic_id,
            "title": t.title,
            "description": t.description,
            "icon_url": t.icon_url,
            "hsk_level": t.hsk_level,
            "item_count": item_count
        })
    
    return {"items": result, "total": total, "page": page, "page_size": page_size}

@router.post("/topics")
def admin_create_topic(
    data: TopicCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    topic = models.Topic(
        title=data.title,
        description=data.description,
        icon_url=data.icon_url,
        hsk_level=data.hsk_level
    )
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return {"topic_id": topic.topic_id, "title": topic.title, "message": "Topic created"}

@router.put("/topics/{topic_id}")
def admin_update_topic(
    topic_id: int,
    data: TopicUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    topic = db.query(models.Topic).filter(models.Topic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    if data.title is not None:
        topic.title = data.title
    if data.description is not None:
        topic.description = data.description
    if data.icon_url is not None:
        topic.icon_url = data.icon_url
    if data.hsk_level is not None:
        topic.hsk_level = data.hsk_level
    
    db.commit()
    return {"message": "Topic updated", "topic_id": topic_id}

@router.delete("/topics/{topic_id}")
def admin_delete_topic(
    topic_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    topic = db.query(models.Topic).filter(models.Topic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    # Delete associated lesson items first
    db.query(models.LessonItem).filter(models.LessonItem.topic_id == topic_id).delete()
    db.delete(topic)
    db.commit()
    return {"message": "Topic deleted"}


# ===================== CHARACTERS =====================

@router.get("/characters")
def admin_list_characters(
    search: str = "",
    hsk_level: Optional[int] = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    query = db.query(models.Character)
    if search:
        query = query.filter(
            or_(
                models.Character.hanzi.contains(search),
                models.Character.pinyin.contains(search),
                models.Character.meaning_vi.contains(search)
            )
        )
    if hsk_level is not None:
        query = query.filter(models.Character.hsk_level == hsk_level)
    
    total = query.count()
    items = query.order_by(models.Character.char_id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    result = [{
        "char_id": c.char_id,
        "hanzi": c.hanzi,
        "pinyin": c.pinyin,
        "meaning_vi": c.meaning_vi,
        "hsk_level": c.hsk_level,
        "stroke_count": c.stroke_count,
        "explanation": c.explanation
    } for c in items]
    
    return {"items": result, "total": total, "page": page, "page_size": page_size}

@router.post("/characters")
def admin_create_character(
    data: CharacterCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    existing = db.query(models.Character).filter(models.Character.hanzi == data.hanzi).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Character '{data.hanzi}' already exists (ID: {existing.char_id})")
    
    char = models.Character(
        hanzi=data.hanzi,
        pinyin=data.pinyin,
        meaning_vi=data.meaning_vi,
        hsk_level=data.hsk_level,
        stroke_count=data.stroke_count,
        explanation=data.explanation,
        example_sentence=data.example_sentence
    )
    db.add(char)
    db.commit()
    db.refresh(char)
    return {"char_id": char.char_id, "hanzi": char.hanzi, "message": "Character created"}

@router.put("/characters/{char_id}")
def admin_update_character(
    char_id: int,
    data: CharacterCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    char = db.query(models.Character).filter(models.Character.char_id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    
    char.hanzi = data.hanzi
    char.pinyin = data.pinyin
    char.meaning_vi = data.meaning_vi
    char.hsk_level = data.hsk_level
    char.stroke_count = data.stroke_count
    char.explanation = data.explanation
    char.example_sentence = data.example_sentence
    db.commit()
    return {"message": "Character updated"}

@router.delete("/characters/{char_id}")
def admin_delete_character(
    char_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    char = db.query(models.Character).filter(models.Character.char_id == char_id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    db.delete(char)
    db.commit()
    return {"message": "Character deleted"}

@router.post("/characters/bulk")
def admin_bulk_create_characters(
    data: BulkImportRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    """Bulk import characters from spreadsheet data."""
    created = 0
    skipped = 0
    errors = []
    
    for i, row in enumerate(data.items):
        hanzi = row.get("hanzi", "").strip()
        if not hanzi:
            errors.append(f"Row {i+1}: Missing hanzi")
            continue
        
        existing = db.query(models.Character).filter(models.Character.hanzi == hanzi).first()
        if existing:
            skipped += 1
            continue
        
        char = models.Character(
            hanzi=hanzi,
            pinyin=row.get("pinyin", ""),
            meaning_vi=row.get("meaning_vi", ""),
            hsk_level=row.get("hsk_level"),
            stroke_count=row.get("stroke_count"),
            explanation=row.get("explanation", "")
        )
        db.add(char)
        created += 1
    
    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors}


# ===================== VOCABULARY =====================

@router.get("/vocabulary")
def admin_list_vocabulary(
    search: str = "",
    hsk_level: Optional[int] = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    query = db.query(models.Vocabulary)
    if search:
        query = query.filter(
            or_(
                models.Vocabulary.word.contains(search),
                models.Vocabulary.pinyin.contains(search),
                models.Vocabulary.meaning_vi.contains(search),
                models.Vocabulary.meaning_en.contains(search)
            )
        )
    if hsk_level is not None:
        query = query.filter(models.Vocabulary.hsk_level == hsk_level)
    
    total = query.count()
    items = query.order_by(models.Vocabulary.vocab_id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    result = [{
        "vocab_id": v.vocab_id,
        "word": v.word,
        "pinyin": v.pinyin,
        "meaning_vi": v.meaning_vi,
        "meaning_en": v.meaning_en,
        "hsk_level": v.hsk_level
    } for v in items]
    
    return {"items": result, "total": total, "page": page, "page_size": page_size}

@router.post("/vocabulary")
def admin_create_vocabulary(
    data: VocabularyCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    vocab = models.Vocabulary(
        word=data.word,
        pinyin=data.pinyin,
        meaning_vi=data.meaning_vi,
        meaning_en=data.meaning_en,
        hsk_level=data.hsk_level
    )
    db.add(vocab)
    db.commit()
    db.refresh(vocab)
    return {"vocab_id": vocab.vocab_id, "word": vocab.word, "message": "Vocabulary created"}

@router.put("/vocabulary/{vocab_id}")
def admin_update_vocabulary(
    vocab_id: int,
    data: VocabularyCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    vocab = db.query(models.Vocabulary).filter(models.Vocabulary.vocab_id == vocab_id).first()
    if not vocab:
        raise HTTPException(status_code=404, detail="Vocabulary not found")
    
    vocab.word = data.word
    vocab.pinyin = data.pinyin
    vocab.meaning_vi = data.meaning_vi
    vocab.meaning_en = data.meaning_en
    vocab.hsk_level = data.hsk_level
    db.commit()
    return {"message": "Vocabulary updated"}

@router.delete("/vocabulary/{vocab_id}")
def admin_delete_vocabulary(
    vocab_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    vocab = db.query(models.Vocabulary).filter(models.Vocabulary.vocab_id == vocab_id).first()
    if not vocab:
        raise HTTPException(status_code=404, detail="Vocabulary not found")
    db.delete(vocab)
    db.commit()
    return {"message": "Vocabulary deleted"}

@router.post("/vocabulary/bulk")
def admin_bulk_create_vocabulary(
    data: BulkImportRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    """Bulk import vocabulary from spreadsheet data."""
    created = 0
    skipped = 0
    errors = []
    
    for i, row in enumerate(data.items):
        word = row.get("word", "").strip()
        if not word:
            errors.append(f"Row {i+1}: Missing word")
            continue
        
        existing = db.query(models.Vocabulary).filter(models.Vocabulary.word == word).first()
        if existing:
            skipped += 1
            continue
        
        vocab = models.Vocabulary(
            word=word,
            pinyin=row.get("pinyin", ""),
            meaning_vi=row.get("meaning_vi", ""),
            meaning_en=row.get("meaning_en", ""),
            hsk_level=row.get("hsk_level")
        )
        db.add(vocab)
        created += 1
    
    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors}


# ===================== RADICALS =====================

@router.get("/radicals")
def admin_list_radicals(
    search: str = "",
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    query = db.query(models.Radical)
    if search:
        query = query.filter(
            or_(
                models.Radical.character.contains(search),
                models.Radical.pinyin.contains(search),
                models.Radical.meaning.contains(search)
            )
        )
    
    total = query.count()
    items = query.order_by(models.Radical.radical_id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    result = [{
        "radical_id": r.radical_id,
        "character": r.character,
        "pinyin": r.pinyin,
        "meaning": r.meaning,
        "variants": r.variants,
        "stroke_count": r.stroke_count,
        "mnemonic_tip": r.mnemonic_tip
    } for r in items]
    
    return {"items": result, "total": total, "page": page, "page_size": page_size}

@router.post("/radicals")
def admin_create_radical(
    data: RadicalCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    radical = models.Radical(
        character=data.character,
        pinyin=data.pinyin,
        meaning=data.meaning,
        variants=data.variants,
        stroke_count=data.stroke_count,
        mnemonic_tip=data.mnemonic_tip
    )
    db.add(radical)
    db.commit()
    db.refresh(radical)
    return {"radical_id": radical.radical_id, "character": radical.character, "message": "Radical created"}

@router.put("/radicals/{radical_id}")
def admin_update_radical(
    radical_id: int,
    data: RadicalCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    radical = db.query(models.Radical).filter(models.Radical.radical_id == radical_id).first()
    if not radical:
        raise HTTPException(status_code=404, detail="Radical not found")
    
    radical.character = data.character
    radical.pinyin = data.pinyin
    radical.meaning = data.meaning
    radical.variants = data.variants
    radical.stroke_count = data.stroke_count
    radical.mnemonic_tip = data.mnemonic_tip
    db.commit()
    return {"message": "Radical updated"}

@router.delete("/radicals/{radical_id}")
def admin_delete_radical(
    radical_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    radical = db.query(models.Radical).filter(models.Radical.radical_id == radical_id).first()
    if not radical:
        raise HTTPException(status_code=404, detail="Radical not found")
    db.delete(radical)
    db.commit()
    return {"message": "Radical deleted"}

@router.post("/radicals/bulk")
def admin_bulk_create_radicals(
    data: BulkImportRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    """Bulk import radicals from spreadsheet data."""
    created = 0
    skipped = 0
    errors = []
    
    for i, row in enumerate(data.items):
        char = row.get("character", "").strip()
        if not char:
            errors.append(f"Row {i+1}: Missing character")
            continue
        
        existing = db.query(models.Radical).filter(models.Radical.character == char).first()
        if existing:
            skipped += 1
            continue
        
        radical = models.Radical(
            character=char,
            pinyin=row.get("pinyin", ""),
            meaning=row.get("meaning", ""),
            variants=row.get("variants", ""),
            stroke_count=row.get("stroke_count"),
            mnemonic_tip=row.get("mnemonic_tip", "")
        )
        db.add(radical)
        created += 1
    
    db.commit()
    return {"created": created, "skipped": skipped, "errors": errors}


# ===================== LESSON ITEMS =====================

@router.get("/topics/{topic_id}/items")
def admin_get_topic_items(
    topic_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    items = db.query(models.LessonItem).filter(models.LessonItem.topic_id == topic_id).all()
    result = []
    for item in items:
        entry = {
            "item_id": item.item_id,
            "topic_id": item.topic_id,
            "char_id": item.char_id,
            "vocab_id": item.vocab_id,
        }
        if item.char_id:
            char = db.query(models.Character).filter(models.Character.char_id == item.char_id).first()
            if char:
                entry["type"] = "character"
                entry["label"] = f"{char.hanzi} ({char.pinyin or ''}) - {char.meaning_vi or ''}"
        elif item.vocab_id:
            vocab = db.query(models.Vocabulary).filter(models.Vocabulary.vocab_id == item.vocab_id).first()
            if vocab:
                entry["type"] = "vocabulary"
                entry["label"] = f"{vocab.word} ({vocab.pinyin or ''}) - {vocab.meaning_vi or ''}"
        result.append(entry)
    return result

@router.post("/lesson-items")
def admin_create_lesson_item(
    data: LessonItemCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    item = models.LessonItem(
        topic_id=data.topic_id,
        char_id=data.char_id,
        vocab_id=data.vocab_id
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"item_id": item.item_id, "message": "Lesson item created"}

@router.post("/lesson-items/bulk")
def admin_bulk_create_lesson_items(
    data: BulkLessonItemRequest,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    """Bulk add characters and vocabulary to a topic."""
    topic = db.query(models.Topic).filter(models.Topic.topic_id == data.topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    created = 0
    skipped = 0
    
    for char_id in data.char_ids:
        existing = db.query(models.LessonItem).filter(
            models.LessonItem.topic_id == data.topic_id,
            models.LessonItem.char_id == char_id
        ).first()
        if existing:
            skipped += 1
            continue
        item = models.LessonItem(topic_id=data.topic_id, char_id=char_id)
        db.add(item)
        created += 1
    
    for vocab_id in data.vocab_ids:
        existing = db.query(models.LessonItem).filter(
            models.LessonItem.topic_id == data.topic_id,
            models.LessonItem.vocab_id == vocab_id
        ).first()
        if existing:
            skipped += 1
            continue
        item = models.LessonItem(topic_id=data.topic_id, vocab_id=vocab_id)
        db.add(item)
        created += 1
    
    db.commit()
    return {"created": created, "skipped": skipped, "message": f"Added {created} items to topic"}

@router.delete("/lesson-items/{item_id}")
def admin_delete_lesson_item(
    item_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    item = db.query(models.LessonItem).filter(models.LessonItem.item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Lesson item not found")
    db.delete(item)
    db.commit()
    return {"message": "Lesson item deleted"}


# ===================== SEARCH (unified) =====================

@router.get("/search")
def admin_search(
    q: str = "",
    type: str = "all",
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    """Unified search across characters, vocabulary, radicals for the add-to-topic picker."""
    if not q.strip():
        return {"characters": [], "vocabulary": [], "radicals": []}
    
    results = {}
    
    if type in ("all", "character"):
        chars = db.query(models.Character).filter(
            or_(
                models.Character.hanzi.contains(q),
                models.Character.pinyin.contains(q),
                models.Character.meaning_vi.contains(q)
            )
        ).limit(20).all()
        results["characters"] = [{
            "char_id": c.char_id,
            "hanzi": c.hanzi,
            "pinyin": c.pinyin,
            "meaning_vi": c.meaning_vi,
            "hsk_level": c.hsk_level
        } for c in chars]
    else:
        results["characters"] = []
    
    if type in ("all", "vocabulary"):
        vocabs = db.query(models.Vocabulary).filter(
            or_(
                models.Vocabulary.word.contains(q),
                models.Vocabulary.pinyin.contains(q),
                models.Vocabulary.meaning_vi.contains(q),
                models.Vocabulary.meaning_en.contains(q)
            )
        ).limit(20).all()
        results["vocabulary"] = [{
            "vocab_id": v.vocab_id,
            "word": v.word,
            "pinyin": v.pinyin,
            "meaning_vi": v.meaning_vi,
            "meaning_en": v.meaning_en,
            "hsk_level": v.hsk_level
        } for v in vocabs]
    else:
        results["vocabulary"] = []
    
    if type in ("all", "radical"):
        rads = db.query(models.Radical).filter(
            or_(
                models.Radical.character.contains(q),
                models.Radical.pinyin.contains(q),
                models.Radical.meaning.contains(q)
            )
        ).limit(20).all()
        results["radicals"] = [{
            "radical_id": r.radical_id,
            "character": r.character,
            "pinyin": r.pinyin,
            "meaning": r.meaning
        } for r in rads]
    else:
        results["radicals"] = []
    
    return results


# ===================== DASHBOARD STATS =====================

@router.get("/stats")
def admin_dashboard_stats(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    """Get overall stats for admin dashboard."""
    # Get active AI provider info
    active_provider = db.query(models.AiProviderSetting).filter(
        models.AiProviderSetting.is_active == True
    ).first()
    
    return {
        "total_users": db.query(func.count(models.User.user_id)).scalar() or 0,
        "total_topics": db.query(func.count(models.Topic.topic_id)).scalar() or 0,
        "total_characters": db.query(func.count(models.Character.char_id)).scalar() or 0,
        "total_vocabulary": db.query(func.count(models.Vocabulary.vocab_id)).scalar() or 0,
        "total_radicals": db.query(func.count(models.Radical.radical_id)).scalar() or 0,
        "total_lesson_items": db.query(func.count(models.LessonItem.item_id)).scalar() or 0,
        "total_posts": db.query(func.count(models.Post.post_id)).scalar() or 0,
        "active_ai_provider": {
            "provider": active_provider.provider,
            "model": active_provider.model
        } if active_provider else None,
    }

# ===================== USERS =====================

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    xp: Optional[int] = None
    streak: Optional[int] = None

@router.get("/users")
def admin_list_users(
    search: str = "",
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    query = db.query(models.User)
    if search:
        query = query.filter(
            or_(
                models.User.username.contains(search),
                models.User.email.contains(search)
            )
        )
    
    total = query.count()
    items = query.order_by(models.User.user_id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    result = [{
        "user_id": u.user_id,
        "username": u.username,
        "email": u.email,
        "role_id": u.role_id,
        "xp": u.xp,
        "streak": u.streak
    } for u in items]
    
    return {"items": result, "total": total, "page": page, "page_size": page_size}

@router.post("/users")
def admin_create_user(
    data: UserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    from ..auth import get_password_hash
    if not data.username or not data.email:
        raise HTTPException(status_code=400, detail="Username and email required")
    
    existing = db.query(models.User).filter(or_(models.User.username == data.username, models.User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or email already exists")

    hashed_password = get_password_hash(data.password or "defaultpassword")
    
    new_user = models.User(
        username=data.username,
        email=data.email,
        password_hash=hashed_password,
        role_id=data.role_id or 2,
        xp=data.xp or 0,
        streak=data.streak or 0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"user_id": new_user.user_id, "message": "User created"}

@router.put("/users/{user_id}")
def admin_update_user(
    user_id: int,
    data: UserUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    from ..auth import get_password_hash
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if data.username is not None: user.username = data.username
    if data.email is not None: user.email = data.email
    if data.password: user.password_hash = get_password_hash(data.password)
    if data.role_id is not None: user.role_id = data.role_id
    if data.xp is not None: user.xp = data.xp
    if data.streak is not None: user.streak = data.streak
    
    db.commit()
    return {"message": "User updated"}

@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
        
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}


# ===================== POSTS =====================

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    likes: Optional[int] = None

@router.get("/posts")
def admin_list_posts(
    search: str = "",
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    query = db.query(models.Post)
    if search:
        query = query.filter(
            or_(
                models.Post.title.contains(search),
                models.Post.content.contains(search)
            )
        )
    
    total = query.count()
    items = query.order_by(models.Post.post_id.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    result = []
    for p in items:
        author = db.query(models.User).filter(models.User.user_id == p.user_id).first()
        result.append({
            "post_id": p.post_id,
            "title": p.title,
            "content": p.content,
            "likes": p.likes,
            "created_at": p.created_at,
            "author_name": author.username if author else "Unknown"
        })
    
    return {"items": result, "total": total, "page": page, "page_size": page_size}

@router.post("/posts")
def admin_create_post(
    data: PostUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    if not data.title or not data.content:
        raise HTTPException(status_code=400, detail="Title and content required")
        
    post = models.Post(
        user_id=admin.user_id,
        title=data.title,
        content=data.content,
        likes=data.likes or 0
    )
    db.add(post)
    db.commit()
    return {"message": "Post created"}

@router.put("/posts/{post_id}")
def admin_update_post(
    post_id: int,
    data: PostUpdate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    post = db.query(models.Post).filter(models.Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if data.title is not None: post.title = data.title
    if data.content is not None: post.content = data.content
    if data.likes is not None: post.likes = data.likes
    
    db.commit()
    return {"message": "Post updated"}

@router.delete("/posts/{post_id}")
def admin_delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    post = db.query(models.Post).filter(models.Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}


# ===================== AI PROVIDERS (inspired by HanVira) =====================

@router.get("/ai-providers")
def admin_list_ai_providers(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    """List all configured AI providers. Active provider shown first."""
    providers = db.query(models.AiProviderSetting).order_by(
        models.AiProviderSetting.is_active.desc(),
        models.AiProviderSetting.updated_at.desc()
    ).all()
    
    return [
        {
            "id": p.id,
            "provider": p.provider,
            "model": p.model,
            "is_active": p.is_active,
            "updated_at": p.updated_at,
            "updated_by": p.updated_by,
        }
        for p in providers
    ]


@router.post("/ai-providers")
def admin_set_ai_provider(
    data: schemas.AiProviderCreate,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    """
    Create or update an AI provider and activate it.
    Only one provider can be active at a time.
    Mirrors HanVira's admin/ai-providers endpoint.
    """
    # Deactivate all existing providers
    db.query(models.AiProviderSetting).update({"is_active": False})
    
    # Check if this provider already exists
    existing = db.query(models.AiProviderSetting).filter(
        models.AiProviderSetting.provider == data.provider.lower()
    ).first()
    
    encrypted_key = AiProviderFactory.encrypt(data.api_key)
    
    if existing:
        existing.api_key = encrypted_key
        existing.model = data.model
        existing.is_active = True
        existing.updated_at = datetime.now()
        existing.updated_by = admin.username
    else:
        new_provider = models.AiProviderSetting(
            provider=data.provider.lower(),
            api_key=encrypted_key,
            model=data.model,
            is_active=True,
            updated_by=admin.username
        )
        db.add(new_provider)
    
    db.commit()
    return {"message": f"\u2705 Đã kích hoạt {data.provider} · {data.model}!"}


@router.delete("/ai-providers/{provider}")
def admin_delete_ai_provider(
    provider: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin)
):
    """Delete an AI provider configuration."""
    setting = db.query(models.AiProviderSetting).filter(
        models.AiProviderSetting.provider == provider.lower()
    ).first()
    
    if not setting:
        raise HTTPException(status_code=404, detail=f"Provider '{provider}' not found")
    
    db.delete(setting)
    db.commit()
    return {"message": f"Đã xóa provider: {provider}"}
