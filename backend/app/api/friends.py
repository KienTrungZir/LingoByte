from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List
from ..database import get_db
from .. import models, schemas
from ..deps import get_current_user

router = APIRouter(
    prefix="/friends",
    tags=["friends"]
)

@router.post("/request", response_model=schemas.FriendshipResponse)
def send_friend_request(
    request: schemas.FriendshipCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.user_id == request.friend_id:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
        
    friend = db.query(models.User).filter(models.User.user_id == request.friend_id).first()
    if not friend:
        raise HTTPException(status_code=404, detail="User not found")
        
    # Check existing friendship
    existing = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == current_user.user_id, models.Friendship.friend_id == request.friend_id),
            and_(models.Friendship.user_id == request.friend_id, models.Friendship.friend_id == current_user.user_id)
        )
    ).first()
    
    if existing:
        if existing.status == 'accepted':
            raise HTTPException(status_code=400, detail="Already friends")
        raise HTTPException(status_code=400, detail="Friend request already exists")
        
    new_friendship = models.Friendship(
        user_id=current_user.user_id,
        friend_id=request.friend_id,
        status="pending"
    )
    db.add(new_friendship)
    db.commit()
    db.refresh(new_friendship)
    return new_friendship

@router.put("/accept/{friendship_id}", response_model=schemas.FriendshipResponse)
def accept_friend_request(
    friendship_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    friendship = db.query(models.Friendship).filter(models.Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
        
    # Only the receiver can accept
    if friendship.friend_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to accept this request")
        
    if friendship.status == 'accepted':
        raise HTTPException(status_code=400, detail="Already accepted")
        
    friendship.status = 'accepted'
    db.commit()
    db.refresh(friendship)
    return friendship

@router.delete("/remove/{friendship_id}")
def remove_friend(
    friendship_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    friendship = db.query(models.Friendship).filter(models.Friendship.id == friendship_id).first()
    if not friendship:
        raise HTTPException(status_code=404, detail="Friendship not found")
        
    if friendship.user_id != current_user.user_id and friendship.friend_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to remove this friendship")
        
    db.delete(friendship)
    db.commit()
    return {"detail": "Friendship removed"}

@router.get("/list", response_model=List[schemas.FriendItem])
def list_friends(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    friendships = db.query(models.Friendship).filter(
        or_(models.Friendship.user_id == current_user.user_id, models.Friendship.friend_id == current_user.user_id)
    ).all()
    
    results = []
    for f in friendships:
        is_requester = f.user_id == current_user.user_id
        friend_user = f.friend if is_requester else f.user
        
        # Build PublicProfile
        user_profile = schemas.PublicProfile(
            user_id=friend_user.user_id,
            username=friend_user.username,
            role_id=friend_user.role_id,
            xp=friend_user.xp or 0,
            streak=friend_user.streak or 0,
            elo_rating=friend_user.elo_rating or 1200,
            hsk_target=friend_user.hsk_target,
            avatar_url=friend_user.avatar_url,
            bio=friend_user.bio,
            created_at=friend_user.created_at
        )
        
        results.append(schemas.FriendItem(
            friendship_id=f.id,
            user=user_profile,
            status=f.status,
            is_requester=is_requester
        ))
        
    return results

# ========== DIRECT MESSAGES ==========

@router.get("/messages/conversations")
def get_conversations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of friends with last message preview and unread count."""
    from sqlalchemy import func, case, literal_column

    # Get accepted friends
    friendships = db.query(models.Friendship).filter(
        or_(models.Friendship.user_id == current_user.user_id, models.Friendship.friend_id == current_user.user_id),
        models.Friendship.status == 'accepted'
    ).all()

    conversations = []
    for f in friendships:
        is_requester = f.user_id == current_user.user_id
        friend_user = f.friend if is_requester else f.user

        # Get last message between the two
        last_msg = db.query(models.DirectMessage).filter(
            or_(
                and_(models.DirectMessage.sender_id == current_user.user_id, models.DirectMessage.receiver_id == friend_user.user_id),
                and_(models.DirectMessage.sender_id == friend_user.user_id, models.DirectMessage.receiver_id == current_user.user_id),
            )
        ).order_by(models.DirectMessage.created_at.desc()).first()

        # Count unread
        unread = db.query(func.count(models.DirectMessage.id)).filter(
            models.DirectMessage.sender_id == friend_user.user_id,
            models.DirectMessage.receiver_id == current_user.user_id,
            models.DirectMessage.is_read == False
        ).scalar() or 0

        conversations.append({
            "friend_id": friend_user.user_id,
            "username": friend_user.username,
            "avatar_url": friend_user.avatar_url,
            "last_message": last_msg.content[:80] if last_msg else None,
            "last_message_time": last_msg.created_at.isoformat() if last_msg else None,
            "last_message_is_mine": last_msg.sender_id == current_user.user_id if last_msg else False,
            "unread": unread
        })

    # Sort: conversations with messages first (by time), then those without
    conversations.sort(key=lambda c: c["last_message_time"] or "", reverse=True)
    return conversations


@router.get("/messages/{friend_id}")
def get_messages(
    friend_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get message history with a specific friend."""
    # Verify friendship
    friendship = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == current_user.user_id, models.Friendship.friend_id == friend_id),
            and_(models.Friendship.user_id == friend_id, models.Friendship.friend_id == current_user.user_id)
        ),
        models.Friendship.status == 'accepted'
    ).first()
    if not friendship:
        raise HTTPException(status_code=403, detail="Not friends")

    messages = db.query(models.DirectMessage).filter(
        or_(
            and_(models.DirectMessage.sender_id == current_user.user_id, models.DirectMessage.receiver_id == friend_id),
            and_(models.DirectMessage.sender_id == friend_id, models.DirectMessage.receiver_id == current_user.user_id),
        )
    ).order_by(models.DirectMessage.created_at.desc()).offset(offset).limit(limit).all()

    # Mark received messages as read
    db.query(models.DirectMessage).filter(
        models.DirectMessage.sender_id == friend_id,
        models.DirectMessage.receiver_id == current_user.user_id,
        models.DirectMessage.is_read == False
    ).update({models.DirectMessage.is_read: True})
    db.commit()

    return [{
        "id": m.id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "content": m.content,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat()
    } for m in reversed(messages)]


from pydantic import BaseModel as PydanticBaseModel
class SendMessagePayload(PydanticBaseModel):
    content: str

@router.post("/messages/{friend_id}")
async def send_message(
    friend_id: int,
    payload: SendMessagePayload,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a direct message to a friend."""
    if not payload.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Verify friendship
    friendship = db.query(models.Friendship).filter(
        or_(
            and_(models.Friendship.user_id == current_user.user_id, models.Friendship.friend_id == friend_id),
            and_(models.Friendship.user_id == friend_id, models.Friendship.friend_id == current_user.user_id)
        ),
        models.Friendship.status == 'accepted'
    ).first()
    if not friendship:
        raise HTTPException(status_code=403, detail="Not friends")

    msg = models.DirectMessage(
        sender_id=current_user.user_id,
        receiver_id=friend_id,
        content=payload.content.strip()
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Push real-time notification via WebSocket
    from .notifications import manager as notif_manager
    await notif_manager.send_personal_message({
        "type": "direct_message",
        "message": {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "sender_username": current_user.username,
            "sender_avatar": current_user.avatar_url,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        }
    }, friend_id)

    return {
        "id": msg.id,
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "content": msg.content,
        "is_read": msg.is_read,
        "created_at": msg.created_at.isoformat()
    }
