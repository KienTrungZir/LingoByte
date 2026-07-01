import json
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException
from ..deps import get_current_user_from_token, get_current_user
from ..models import User

router = APIRouter(
    prefix="/notifications",
    tags=["notifications"]
)

class NotificationManager:
    def __init__(self):
        # Maps user_id -> List of WebSockets (user might have multiple tabs open)
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except:
                    pass
                    
    def get_online_users(self) -> List[int]:
        return list(self.active_connections.keys())

manager = NotificationManager()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        user = await get_current_user_from_token(token)
    except Exception as e:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket, user.user_id)
    try:
        while True:
            # We don't really expect clients to send messages here, but we must receive to keep connection alive
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.user_id)

@router.get("/online")
def get_online_users():
    return manager.get_online_users()

from pydantic import BaseModel
class InvitePayload(BaseModel):
    friend_id: int
    room_id: str

@router.post("/game/invite")
async def invite_to_game(
    payload: InvitePayload,
    current_user: User = Depends(get_current_user)
):
    if payload.friend_id not in manager.active_connections:
        raise HTTPException(status_code=400, detail="User is not online")
        
    message = {
        "type": "game_invite",
        "sender_id": current_user.user_id,
        "sender_username": current_user.username,
        "room_id": payload.room_id
    }
    
    await manager.send_personal_message(message, payload.friend_id)
    return {"detail": "Invite sent successfully"}
