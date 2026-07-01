from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user

router = APIRouter(
    prefix="/community",
    tags=["community"]
)

import re
from datetime import datetime

# Simple content filter (Aho-Corasick would be better for large lists, but regex is fine for demo)
BAD_WORDS = [r"xấu", r"tệ", r"vi phạm", r"quảng cáo"] # Demo list

def moderate_content(text: str) -> bool:
    for word in BAD_WORDS:
        if re.search(word, text, re.IGNORECASE):
            return False
    return True

def calculate_priority_score(likes: int, comments_count: int, shares: int, created_at: datetime) -> float:
    # Score = (L * 1) + (C * 2) + (S * 3) - (H * 0.5)
    hours_since_post = (datetime.now() - created_at).total_seconds() / 3600
    score = (likes * 1) + (comments_count * 2) + (shares * 3) - (hours_since_post * 0.5)
    return max(0.0, score)

@router.get("/posts", response_model=List[schemas.Post])
def get_posts(tag: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Post)
    
    if tag:
        query = query.join(models.Post.tags).filter(models.Tag.name == tag)
        
    posts = query.all()
    
    # Update priority scores on the fly for demo (ideally a background task)
    for post in posts:
        post.priority_score = calculate_priority_score(post.likes, len(post.comments), post.shares, post.created_at)
    
    # Sort by priority score
    return sorted(posts, key=lambda x: x.priority_score, reverse=True)

@router.post("/posts", response_model=schemas.Post)
def create_post(post: schemas.PostCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not moderate_content(post.title) or not moderate_content(post.content):
        raise HTTPException(status_code=400, detail="Nội dung chứa từ ngữ không phù hợp hoặc vi phạm quy tắc cộng đồng.")

    new_post = models.Post(
        title=post.title,
        content=post.content,
        user_id=current_user.user_id
    )
    db.add(new_post)
    db.commit()
    db.refresh(new_post)
    return new_post

@router.post("/posts/{post_id}/like")
def like_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.likes += 1
    db.commit()
    return {"likes": post.likes}

@router.get("/posts/{post_id}", response_model=schemas.Post)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post

@router.post("/posts/{post_id}/comments", response_model=schemas.Comment)
def create_comment(post_id: int, comment: schemas.CommentBase, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(models.Post).filter(models.Post.post_id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    new_comment = models.Comment(
        content=comment.content,
        post_id=post_id,
        user_id=current_user.user_id
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)
    return new_comment
