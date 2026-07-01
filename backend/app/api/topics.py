from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user

router = APIRouter(
    prefix="/topics",
    tags=["topics"]
)

@router.get("/", response_model=List[schemas.Topic])
def get_topics(db: Session = Depends(get_db)):
    return db.query(models.Topic).all()

@router.get("/{topic_id}", response_model=schemas.Topic)
def get_topic(topic_id: int, db: Session = Depends(get_db)):
    topic = db.query(models.Topic).filter(models.Topic.topic_id == topic_id).first()
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    return topic

@router.get("/{topic_id}/items")
def get_topic_items(topic_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(models.LessonItem).filter(models.LessonItem.topic_id == topic_id).all()
    
    result = []
    for item in items:
        item_data = {
            "item_id": item.item_id,
            "topic_id": item.topic_id,
        }
        
        vocab_id_for_srs = None
        
        if item.char_id:
            char = db.query(models.Character).filter(models.Character.char_id == item.char_id).first()
            if char:
                item_data["type"] = "character"
                item_data["data"] = char
        elif item.vocab_id:
            vocab = db.query(models.Vocabulary).filter(models.Vocabulary.vocab_id == item.vocab_id).first()
            if vocab:
                item_data["type"] = "vocabulary"
                item_data["data"] = vocab
                vocab_id_for_srs = vocab.vocab_id
        
        # Add SRS progress if applicable
        if vocab_id_for_srs:
            user_vocab = db.query(models.UserVocabulary).filter(
                models.UserVocabulary.user_id == current_user.user_id,
                models.UserVocabulary.vocab_id == vocab_id_for_srs
            ).first()
            if user_vocab:
                item_data["srs_level"] = user_vocab.srs_level
                item_data["next_review"] = user_vocab.next_review
            else:
                item_data["srs_level"] = -1 # Indicates 'New/Unseen' internally, not even level 0
        else:
            item_data["srs_level"] = -2 # Not applicable (e.g. character only)
        
        if "type" in item_data:
            result.append(item_data)
            
    return result
