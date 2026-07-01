import uuid
import json
import asyncio
import math
from typing import Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from pydantic import BaseModel
from app.deps import get_current_user
from app.models import User, GameResult
from app.database import SessionLocal

router = APIRouter()

# Load recipes from frontend data for validation
try:
    with open("../frontend/src/data/radical_recipes.json", "r", encoding="utf-8") as f:
        RECIPES = json.load(f)
except Exception as e:
    print(f"Warning: Could not load radical recipes: {e}")
    RECIPES = []

ROWS = 6
COLS = 7
ELO_K = 32  # Elo K-factor

def calculate_elo(winner_elo: int, loser_elo: int) -> tuple:
    """Calculate Elo changes for winner and loser. Returns (winner_change, loser_change)."""
    expected_winner = 1 / (1 + math.pow(10, (loser_elo - winner_elo) / 400))
    expected_loser = 1 / (1 + math.pow(10, (winner_elo - loser_elo) / 400))
    
    winner_change = round(ELO_K * (1 - expected_winner))
    loser_change = round(ELO_K * (0 - expected_loser))
    
    return winner_change, loser_change

def save_game_result(room):
    """Save game result to database and update Elo ratings."""
    db = SessionLocal()
    try:
        host = db.query(User).filter(User.user_id == room.host_id).first()
        guest = db.query(User).filter(User.user_id == room.guest_id).first()
        
        if not host or not guest:
            print(f"Warning: Could not find players for room {room.room_id}")
            return
        
        if room.winner:
            # Determine winner/loser
            if room.winner == 1:
                winner, loser = host, guest
                winner_score, loser_score = room.p1_score, room.p2_score
            else:
                winner, loser = guest, host
                winner_score, loser_score = room.p2_score, room.p1_score
            
            # Calculate Elo changes
            elo_gain, elo_loss = calculate_elo(winner.elo_rating or 1200, loser.elo_rating or 1200)
            
            # Save result
            result = GameResult(
                room_id=room.room_id,
                winner_id=winner.user_id,
                loser_id=loser.user_id,
                winner_score=winner_score,
                loser_score=loser_score,
                elo_change=elo_gain,
                is_draw=False
            )
            db.add(result)
            
            # Update Elo ratings
            winner.elo_rating = (winner.elo_rating or 1200) + elo_gain
            loser.elo_rating = max(100, (loser.elo_rating or 1200) + elo_loss)  # Floor at 100
            
            # Store elo changes in room for broadcasting
            room.elo_changes = {
                "winner_gain": elo_gain,
                "loser_loss": elo_loss,
                "winner_new_elo": winner.elo_rating,
                "loser_new_elo": loser.elo_rating
            }
        else:
            # Draw - no Elo change
            result = GameResult(
                room_id=room.room_id,
                winner_id=host.user_id,
                loser_id=guest.user_id,
                winner_score=room.p1_score,
                loser_score=room.p2_score,
                elo_change=0,
                is_draw=True
            )
            db.add(result)
            room.elo_changes = {"winner_gain": 0, "loser_loss": 0}
        
        db.commit()
        print(f"Game result saved for room {room.room_id}")
    except Exception as e:
        db.rollback()
        print(f"Error saving game result: {e}")
    finally:
        db.close()

class Room:
    def __init__(self, room_id: str, host: User):
        self.room_id = room_id
        self.host_id = host.user_id
        self.host_username = host.username
        self.guest_id = None
        self.guest_username = None
        
        self.status = "waiting" # waiting, playing, finished
        self.board = [[] for _ in range(COLS)] # 7 columns
        self.turn = 1 # 1 for host, 2 for guest
        self.winner = None
        
        self.p1_score = 0
        self.p2_score = 0
        self.logs = []
        self.elo_changes = None
        
        self.connections: List[WebSocket] = []
        self.time_left = 45
        self.timer_task = None

    def dict_state(self):
        state = {
            "room_id": self.room_id,
            "host_username": self.host_username,
            "guest_username": self.guest_username,
            "status": self.status,
            "board": self.board,
            "turn": self.turn,
            "winner": self.winner,
            "p1Score": self.p1_score,
            "p2Score": self.p2_score,
            "logs": self.logs,
            "timeLeft": self.time_left
        }
        if self.elo_changes:
            state["eloChanges"] = self.elo_changes
        return state

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def create_room(self, host: User) -> Room:
        room_id = str(uuid.uuid4())[:8]
        room = Room(room_id, host)
        self.rooms[room_id] = room
        return room

    def get_rooms(self):
        return [
            {
                "id": r.room_id, 
                "host": r.host_username, 
                "guest": r.guest_username,
                "status": r.status
            } 
            for r in self.rooms.values() if r.status == "waiting"
        ]

    async def connect(self, websocket: WebSocket, room_id: str, user: User):
        room = self.rooms.get(room_id)
        if not room:
            await websocket.send_json({"type": "error", "message": "Room not found"})
            await websocket.close()
            return None

        # Determine player index
        player_idx = 0
        if room.host_id == user.user_id:
            player_idx = 1
        elif room.guest_id is None and room.status == "waiting":
            room.guest_id = user.user_id
            room.guest_username = user.username
            room.status = "playing"
            player_idx = 2
            # Start timer when guest joins
            room.timer_task = asyncio.create_task(self.run_timer(room_id))
        elif room.guest_id == user.user_id:
            player_idx = 2
        else:
            await websocket.send_json({"type": "error", "message": "Room is full"})
            await websocket.close()
            return None

        room.connections.append(websocket)
        await self.broadcast_state(room_id)
        return player_idx

    def disconnect(self, websocket: WebSocket, room_id: str):
        room = self.rooms.get(room_id)
        if room and websocket in room.connections:
            room.connections.remove(websocket)
            if len(room.connections) == 0:
                # Cancel timer
                if room.timer_task:
                    room.timer_task.cancel()
                    room.timer_task = None
                
                async def cleanup_room():
                    await asyncio.sleep(5)
                    r = self.rooms.get(room_id)
                    if r and len(r.connections) == 0:
                        del self.rooms[room_id]
                
                asyncio.create_task(cleanup_room())

    async def broadcast_state(self, room_id: str):
        room = self.rooms.get(room_id)
        if not room: return
        state = room.dict_state()
        for conn in room.connections:
            try:
                await conn.send_json({"type": "state_update", "state": state})
            except:
                pass

    async def run_timer(self, room_id: str):
        try:
            while True:
                await asyncio.sleep(1)
                room = self.rooms.get(room_id)
                if not room or room.status != "playing":
                    break
                
                room.time_left -= 1
                if room.time_left <= 0:
                    # Switch turn
                    room.turn = 2 if room.turn == 1 else 1
                    room.time_left = 45
                
                await self.broadcast_state(room_id)
        except asyncio.CancelledError:
            pass

    def check_win(self, board, col, row, player):
        directions = [
            [(0, 1), (0, -1)], # Vertical
            [(1, 0), (-1, 0)], # Horizontal
            [(1, 1), (-1, -1)],# Diagonal /
            [(1, -1), (-1, 1)] # Diagonal \
        ]
        for dir_pair in directions:
            count = 1
            for vec in dir_pair:
                r, c = row + vec[1], col + vec[0]
                while 0 <= c < COLS and 0 <= r < ROWS and len(board[c]) > r and board[c][r]["player"] == player:
                    count += 1
                    c += vec[0]
                    r += vec[1]
            if count >= 4:
                return True
        return False

    def finish_game(self, room):
        """Handle game finish: save results and update Elo."""
        room.status = "finished"
        if room.timer_task:
            room.timer_task.cancel()
        # Save game result if both players exist
        if room.guest_id:
            save_game_result(room)

    async def handle_move(self, room_id: str, player_idx: int, col_index: int, radical: str):
        room = self.rooms.get(room_id)
        if not room or room.status != "playing" or room.turn != player_idx:
            return

        if col_index < 0 or col_index >= COLS: return
        col = room.board[col_index]
        if len(col) >= ROWS: return

        # Validation
        recipe = None
        if len(col) > 0:
            top_text = col[-1]["text"]
            for r in RECIPES:
                if (r["top"] == radical and r["bottom"] == top_text) or \
                   (r["bottom"] == radical and r["top"] == top_text):
                    recipe = r
                    break
            
            if not recipe:
                # Invalid drop
                return

        # Valid Drop
        new_piece = {
            "id": str(uuid.uuid4())[:8],
            "text": radical,
            "player": player_idx,
            "isStar": recipe["score"] >= 400 if recipe else False
        }
        col.append(new_piece)

        # Update scores
        if recipe:
            score_add = recipe["score"]
            if player_idx == 1: room.p1_score += score_add
            else: room.p2_score += score_add
            
            room.logs.append({
                "id": str(uuid.uuid4())[:8],
                "text": f"Bộ {radical} + {top_text} -> {recipe['result']} ({recipe['meaning']})",
                "player": player_idx,
                "score": score_add
            })

        # Check win
        is_win = self.check_win(room.board, col_index, len(col)-1, player_idx)
        if is_win:
            room.winner = player_idx
            self.finish_game(room)
        else:
            # Check tie
            is_full = all(len(c) >= ROWS for c in room.board)
            if is_full:
                # Determine winner by score
                if room.p1_score > room.p2_score:
                    room.winner = 1
                elif room.p2_score > room.p1_score:
                    room.winner = 2
                else:
                    room.winner = None  # True draw
                self.finish_game(room)
            else:
                room.turn = 2 if player_idx == 1 else 1
                room.time_left = 45
        
        await self.broadcast_state(room_id)


manager = ConnectionManager()


@router.post("/rooms")
async def create_room(current_user: User = Depends(get_current_user)):
    room = manager.create_room(current_user)
    return {"room_id": room.room_id}

@router.get("/rooms")
async def list_rooms():
    return manager.get_rooms()

@router.get("/ws/{room_id}")
async def debug_ws_path(room_id: str):
    return {"message": "WS path reached via GET", "room_id": room_id}

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str, token: str = Query(...)):
    await websocket.accept()
    
    # Need to authenticate via token
    from app.deps import get_current_user_from_token
    try:
        user = await get_current_user_from_token(token)
    except Exception as e:
        print(f"WS Auth Error: {e}")
        await websocket.send_json({"type": "error", "message": "Authentication failed"})
        await websocket.close(code=1008)
        return

    player_idx = await manager.connect(websocket, room_id, user)
    if player_idx is None:
        # manager.connect already sent error and closed
        return

    try:
        while True:
            data = await websocket.receive_json()
            if data.get("type") == "drop":
                await manager.handle_move(
                    room_id, 
                    player_idx, 
                    data.get("colIndex"), 
                    data.get("radical")
                )
    except (WebSocketDisconnect, RuntimeError):
        manager.disconnect(websocket, room_id)
        await manager.broadcast_state(room_id)
