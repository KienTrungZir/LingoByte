from datetime import datetime, timedelta, date
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, Date
from typing import List
from . import models, schemas, auth
from .database import engine, get_db
from .api import topics, game, community, chat, handwriting, voice, admin_api, friends, notifications
from .services.handwriting import handwriting_service
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from .deps import get_current_user
from sqladmin import Admin
from .admin import setup_admin, AdminAuth
from starlette.middleware.sessions import SessionMiddleware
from .auth import SECRET_KEY

app = FastAPI(title="Smart Hanzi Learning API")

# Initialize SQLAdmin with Auth
authentication_backend = AdminAuth(secret_key=SECRET_KEY)
admin = Admin(app, engine, authentication_backend=authentication_backend)
setup_admin(admin)

# Add Session Middleware (required for SQLAdmin Auth)
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Hanzi Learning Ecosystem API"}

app.include_router(topics.router)
app.include_router(game.router, prefix="/api/game", tags=["game"])
app.include_router(community.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(handwriting.router, prefix="/api/handwriting", tags=["handwriting"])
app.include_router(voice.router, prefix="/api", tags=["voice"])
app.include_router(admin_api.router)
app.include_router(friends.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")

# Authentication Dependency is now in deps.py

# Auth Routes
@app.post("/auth/register", response_model=schemas.UserProfile)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    db_email = db.query(models.User).filter(models.User.email == user.email).first()
    if db_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        hsk_target=1, # Default
        xp=0,
        streak=0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/token", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/characters", response_model=List[schemas.CharacterBase])
def get_characters(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    characters = db.query(models.Character).offset(skip).limit(limit).all()
    return characters

@app.get("/characters/{char_id}", response_model=schemas.CharacterDetail)
def get_character(char_id: int, db: Session = Depends(get_db)):
    db_char = db.query(models.Character).filter(models.Character.char_id == char_id).first()
    if db_char is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return db_char

@app.get("/users/me", response_model=schemas.UserProfile)
def get_user_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.put("/users/me", response_model=schemas.UserProfile)
def update_user_profile(update: schemas.UserUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if update.bio is not None:
        current_user.bio = update.bio
    if update.avatar_url is not None:
        current_user.avatar_url = update.avatar_url
    if update.hsk_target is not None:
        current_user.hsk_target = update.hsk_target
    db.commit()
    db.refresh(current_user)
    return current_user

@app.put("/users/me/password")
def change_password(data: schemas.PasswordChange, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not auth.verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Mật khẩu hiện tại không đúng")
    current_user.password_hash = auth.get_password_hash(data.new_password)
    db.commit()
    return {"status": "success", "message": "Đổi mật khẩu thành công"}

@app.get("/users/profile/{username}", response_model=schemas.PublicProfile)
def get_public_profile(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
    return user

@app.get("/users/me/activity")
def get_user_activity(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    posts_count = db.query(func.count(models.Post.post_id)).filter(
        models.Post.user_id == current_user.user_id
    ).scalar() or 0
    
    games_count = db.query(func.count(models.GameResult.result_id)).filter(
        (models.GameResult.winner_id == current_user.user_id) | 
        (models.GameResult.loser_id == current_user.user_id)
    ).scalar() or 0
    
    words_learned = db.query(func.count(models.UserVocabulary.id)).filter(
        models.UserVocabulary.user_id == current_user.user_id
    ).scalar() or 0
    
    days_joined = 0
    if current_user.created_at:
        days_joined = (datetime.now() - current_user.created_at).days
    
    seven_days_ago = date.today() - timedelta(days=6)
    
    # Get UserDailyStats
    daily_stats = db.query(models.UserDailyStats).filter(
        models.UserDailyStats.user_id == current_user.user_id,
        models.UserDailyStats.study_date >= seven_days_ago
    ).order_by(models.UserDailyStats.study_date.asc()).all()
    
    # Also count vocab reviews per day from UserVocabulary.last_reviewed
    seven_days_ago_dt = datetime.combine(seven_days_ago, datetime.min.time())
    vocab_reviews = db.query(
        func.cast(models.UserVocabulary.last_reviewed, Date).label('review_date'),
        func.count(models.UserVocabulary.id).label('review_count')
    ).filter(
        models.UserVocabulary.user_id == current_user.user_id,
        models.UserVocabulary.last_reviewed >= seven_days_ago_dt
    ).group_by(
        func.cast(models.UserVocabulary.last_reviewed, Date)
    ).all()
    
    vocab_by_date = {r.review_date: r.review_count for r in vocab_reviews}
    
    study_history = []
    for i in range(7):
        d = seven_days_ago + timedelta(days=i)
        stat = next((s for s in daily_stats if s.study_date == d), None)
        vocab_count = vocab_by_date.get(d, 0)
        chars_from_stats = stat.chars_learned if stat else 0
        study_history.append({
            "date": d.strftime("%d/%m"),
            "chars_learned": chars_from_stats + vocab_count,
            "minutes_spent": stat.minutes_spent if stat else 0
        })
    
    return {
        "posts_count": posts_count,
        "games_count": games_count,
        "words_learned": words_learned,
        "days_joined": days_joined,
        "study_history": study_history
    }

@app.get("/users/me/stats", response_model=schemas.DashboardStats)
def get_user_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Calculate HSK Progress
    hsk_target = current_user.hsk_target or 1
    
    # Total words in target HSK level
    total_words = db.query(func.count(models.Vocabulary.vocab_id)).filter(
        models.Vocabulary.hsk_level == hsk_target
    ).scalar() or 1
    
    # Words learned: Count words in UserVocabulary with srs_level > 0 or at least exists
    learned_count = db.query(func.count(models.UserVocabulary.id)).filter(
        models.UserVocabulary.user_id == current_user.user_id
    ).scalar() or 0
    
    # Review items: items where next_review <= now
    now = datetime.now()
    review_items = db.query(models.UserVocabulary).filter(
        models.UserVocabulary.user_id == current_user.user_id,
        models.UserVocabulary.next_review <= now
    ).order_by(models.UserVocabulary.next_review.asc()).all()
    
    review_count = len(review_items)
    upcoming = review_items[:4] # Top 4 for FastCard
    
    return {
        "xp": current_user.xp,
        "streak": current_user.streak,
        "hsk_target": hsk_target,
        "words_learned": learned_count,
        "words_total": total_words,
        "progress_percentage": round((learned_count / total_words) * 100, 1),
        "review_count": review_count,
        "upcoming_reviews": upcoming
    }

@app.post("/users/me/srs/record")
def record_srs_progress(record: schemas.SRSRecord, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Update or Create UserVocabulary entry
    user_vocab = db.query(models.UserVocabulary).filter(
        models.UserVocabulary.user_id == current_user.user_id,
        models.UserVocabulary.vocab_id == record.vocab_id
    ).first()
    
    if not user_vocab:
        user_vocab = models.UserVocabulary(
            user_id=current_user.user_id,
            vocab_id=record.vocab_id,
            srs_level=0,
            next_review=datetime.now()
        )
        db.add(user_vocab)
        db.flush()
    
    # 2. Update SRS Level based on result
    # User requested: mới=0h, learning=12h, reviewing=48h, mastered=7 ngày
    intervals = {
        0: 12,    # New -> Learning (12h)
        1: 48,    # Learning -> Reviewing (48h)
        2: 24 * 7 # Reviewing -> Mastered (7 days)
    }
    
    xp_earned = 0
    if record.success:
        user_vocab.srs_level = min(user_vocab.srs_level + 1, 3)
        hours = intervals.get(user_vocab.srs_level - 1, 24 * 30) # Default 30 days if level 3
        user_vocab.next_review = datetime.now() + timedelta(hours=hours)
        user_vocab.times_reviewed += 1
        xp_earned = 10 * (user_vocab.srs_level + 1)
    else:
        # If failed, drop level but not below 0
        user_vocab.srs_level = max(user_vocab.srs_level - 1, 0)
        user_vocab.next_review = datetime.now() + timedelta(hours=12)
        xp_earned = 2
        
    user_vocab.last_reviewed = datetime.now()
    
    # 3. Update User XP and Streak
    current_user.xp += xp_earned
    
    # Streak logic
    today = date.today()
    if current_user.last_study_date:
        if current_user.last_study_date == today:
            pass # Already studied today
        elif current_user.last_study_date == today - timedelta(days=1):
            current_user.streak += 1
        else:
            current_user.streak = 1
    else:
        current_user.streak = 1
        
    current_user.last_study_date = today
    
    # Update UserDailyStats
    daily_stat = db.query(models.UserDailyStats).filter(
        models.UserDailyStats.user_id == current_user.user_id,
        models.UserDailyStats.study_date == today
    ).first()
    if not daily_stat:
        daily_stat = models.UserDailyStats(user_id=current_user.user_id, study_date=today)
        db.add(daily_stat)
    
    if daily_stat.chars_learned is None:
        daily_stat.chars_learned = 0
    daily_stat.chars_learned += 1
    
    db.commit()
    
    return {
        "status": "success",
        "new_level": user_vocab.srs_level,
        "next_review": user_vocab.next_review,
        "xp_earned": xp_earned,
        "total_xp": current_user.xp,
        "streak": current_user.streak
    }

@app.get("/users/me/srs/reviews", response_model=List[schemas.UserVocabularyResult])
def get_all_reviews(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now()
    review_items = db.query(models.UserVocabulary).filter(
        models.UserVocabulary.user_id == current_user.user_id,
        models.UserVocabulary.next_review <= now
    ).order_by(models.UserVocabulary.next_review.asc()).all()
    return review_items

@app.get("/users/me/srs/learned", response_model=List[schemas.UserVocabularyResult])
def get_all_learned(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    learned_items = db.query(models.UserVocabulary).filter(
        models.UserVocabulary.user_id == current_user.user_id
    ).order_by(models.UserVocabulary.srs_level.desc(), models.UserVocabulary.last_reviewed.desc()).all()
    return learned_items

@app.post("/writing-practice")
def submit_practice(practice: schemas.WritingPracticeCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Get Character
    db_char = db.query(models.Character).filter(models.Character.char_id == practice.char_id).first()
    if not db_char:
        raise HTTPException(status_code=404, detail="Character not found")
        
    # 2. Calculate Handwriting Score
    score, message = handwriting_service.calculate_score(practice.strokes, db_char.hanzi)
    
    # 3. Save Practice Record
    new_practice = models.WritingPractice(
        user_id=current_user.user_id,
        char_id=practice.char_id,
        confidence_score=score,
        user_drawing_path="" # We could save strokes as JSON or image path here
    )
    db.add(new_practice)
    
    # 4. Update XP
    xp_earned = int(score / 2) # e.g. score 90 -> 45 XP
    current_user.xp += xp_earned
    
    # 5. Update Daily Stats
    today = date.today()
    stats = db.query(models.UserDailyStats).filter(
        models.UserDailyStats.user_id == current_user.user_id,
        models.UserDailyStats.study_date == today
    ).first()
    
    if not stats:
        stats = models.UserDailyStats(user_id=current_user.user_id, study_date=today)
        db.add(stats)
        
    stats.chars_learned += 1
    
    db.commit()
    
    return {
        "status": "success", 
        "score": score,
        "message": message,
        "xp_earned": xp_earned,
        "total_xp": current_user.xp
    }

@app.get("/dictionary/search", response_model=List[schemas.VocabularyResult])
def search_dictionary(q: str, search_by: str = "all", db: Session = Depends(get_db)):
    if not q.strip():
        return []
    
    q = q.lower()

    if search_by == "vi":
        exact_vi = db.query(models.Vocabulary).filter(models.Vocabulary.meaning_vi == q).all()
        contains_vi = db.query(models.Vocabulary).filter(
            models.Vocabulary.meaning_vi.contains(q)
        ).filter(models.Vocabulary.meaning_vi != q).limit(40).all()
        return exact_vi + contains_vi

    # Smart Search
    
    # 1. Exact matches
    exact_word = db.query(models.Vocabulary).filter(models.Vocabulary.word == q).all()
    exact_meaning_vi = db.query(models.Vocabulary).filter(models.Vocabulary.meaning_vi == q).all()
    exact_pinyin = db.query(models.Vocabulary).filter(models.Vocabulary.pinyin == q).all()
    
    # 2. Starts-with matches (Word, Pinyin)
    startswith_match = db.query(models.Vocabulary).filter(
        (models.Vocabulary.word.startswith(q)) |
        (models.Vocabulary.pinyin.startswith(q + " ")) |
        (models.Vocabulary.pinyin.startswith(q))
    ).filter(
        models.Vocabulary.word != q,
        models.Vocabulary.meaning_vi != q,
        models.Vocabulary.pinyin != q
    ).limit(20).all()
    
    # 3. Contains matches
    # For English and Pinyin, avoid short substring matches if q is too short (<3 chars)
    if len(q) < 3:
        contains_match = db.query(models.Vocabulary).filter(
            (models.Vocabulary.meaning_vi.contains(q)) |
            (models.Vocabulary.word.contains(q))
        ).filter(
            models.Vocabulary.word != q,
            models.Vocabulary.meaning_vi != q,
            ~models.Vocabulary.word.startswith(q)
        ).limit(20).all()
    else:
        contains_match = db.query(models.Vocabulary).filter(
            (models.Vocabulary.word.contains(q)) |
            (models.Vocabulary.pinyin.contains(q)) |
            (models.Vocabulary.meaning_vi.contains(q)) |
            (models.Vocabulary.meaning_en.contains(f" {q} ")) |
            (models.Vocabulary.meaning_en.startswith(f"{q} ")) |
            (models.Vocabulary.meaning_en.endswith(f" {q}"))
        ).filter(
            models.Vocabulary.word != q,
            models.Vocabulary.meaning_vi != q,
            ~models.Vocabulary.word.startswith(q),
            ~models.Vocabulary.pinyin.startswith(q)
        ).limit(20).all()
    
    # Combine results, maintaining priority and removing duplicates
    seen_ids = set()
    combined = []
    
    for item in (exact_word + exact_pinyin + exact_meaning_vi + startswith_match + contains_match):
        if item.vocab_id not in seen_ids:
            combined.append(item)
            seen_ids.add(item.vocab_id)
            
    return combined

@app.get("/dictionary/random", response_model=List[schemas.VocabularyResult])
def get_random_vocab(limit: int = 5, hsk_level: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Vocabulary).filter(
        models.Vocabulary.meaning_vi != None,
        models.Vocabulary.meaning_vi != ''
    )
    if hsk_level:
        query = query.filter(models.Vocabulary.hsk_level == hsk_level)
    results = query.order_by(func.newid()).limit(limit).all()
    return results

@app.get("/flashcard/levels")
def get_flashcard_levels(db: Session = Depends(get_db)):
    """Get vocabulary counts per HSK level for flashcard selection."""
    rows = db.query(
        models.Vocabulary.hsk_level,
        func.count(models.Vocabulary.vocab_id)
    ).filter(
        models.Vocabulary.meaning_vi != None,
        models.Vocabulary.meaning_vi != ''
    ).group_by(models.Vocabulary.hsk_level).order_by(models.Vocabulary.hsk_level).all()
    
    return [{"level": row[0], "count": row[1]} for row in rows if row[0]]

@app.get("/flashcard/cards", response_model=List[schemas.VocabularyResult])
def get_flashcard_cards(hsk_level: int, count: int = 20, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get random flashcards for a specific HSK level, excluding already-learned words."""
    # Get vocab IDs user has already learned
    learned_vocab_ids = db.query(models.UserVocabulary.vocab_id).filter(
        models.UserVocabulary.user_id == current_user.user_id
    ).subquery()

    # Get new words (not yet in UserVocabulary)
    results = db.query(models.Vocabulary).filter(
        models.Vocabulary.hsk_level == hsk_level,
        models.Vocabulary.meaning_vi != None,
        models.Vocabulary.meaning_vi != '',
        ~models.Vocabulary.vocab_id.in_(learned_vocab_ids)
    ).order_by(func.newid()).limit(count).all()

    # If not enough new words, supplement with lowest srs_level words
    if len(results) < count:
        remaining = count - len(results)
        already_ids = [r.vocab_id for r in results]
        supplement = db.query(models.Vocabulary).join(
            models.UserVocabulary,
            (models.UserVocabulary.vocab_id == models.Vocabulary.vocab_id) &
            (models.UserVocabulary.user_id == current_user.user_id)
        ).filter(
            models.Vocabulary.hsk_level == hsk_level,
            models.Vocabulary.meaning_vi != None,
            models.Vocabulary.meaning_vi != '',
            ~models.Vocabulary.vocab_id.in_(already_ids) if already_ids else True
        ).order_by(models.UserVocabulary.srs_level.asc()).limit(remaining).all()
        results.extend(supplement)

    return results
@app.get("/radicals", response_model=List[schemas.RadicalBase])
def get_radicals(
    search: str = "",
    stroke_count: int = None,
    skip: int = 0,
    limit: int = 250,
    db: Session = Depends(get_db)
):
    query = db.query(models.Radical)
    if search:
        query = query.filter(
            (models.Radical.character.contains(search)) |
            (models.Radical.meaning.contains(search)) |
            (models.Radical.pinyin.contains(search))
        )
    if stroke_count:
        query = query.filter(models.Radical.stroke_count == stroke_count)
    return query.order_by(models.Radical.stroke_count, models.Radical.radical_id).offset(skip).limit(limit).all()

@app.get("/radicals/stats", response_model=schemas.RadicalStats)
def get_radical_stats(db: Session = Depends(get_db)):
    total_radicals = db.query(func.count(models.Radical.radical_id)).scalar()
    total_characters = db.query(func.count(models.Character.char_id)).scalar()
    total_links = db.query(func.count()).select_from(models.character_radical_rel).scalar()
    
    # Group by stroke count
    stroke_rows = db.query(
        models.Radical.stroke_count,
        func.count(models.Radical.radical_id)
    ).group_by(models.Radical.stroke_count).order_by(models.Radical.stroke_count).all()
    
    stroke_groups = {str(row[0] or 0): row[1] for row in stroke_rows}
    
    return schemas.RadicalStats(
        total_radicals=total_radicals,
        total_characters=total_characters,
        total_links=total_links,
        stroke_groups=stroke_groups
    )

@app.get("/radicals/{radical_id}", response_model=schemas.RadicalDetail)
def get_radical_detail(radical_id: int, db: Session = Depends(get_db)):
    radical = db.query(models.Radical).filter(models.Radical.radical_id == radical_id).first()
    if not radical:
        raise HTTPException(status_code=404, detail="Radical not found")
    
    # Get associated characters
    characters = radical.characters
    char_list = [
        schemas.RadicalCharacter(
            char_id=c.char_id,
            hanzi=c.hanzi,
            pinyin=c.pinyin,
            meaning_vi=c.meaning_vi,
            hsk_level=c.hsk_level
        ) for c in characters
    ]
    
    return schemas.RadicalDetail(
        radical_id=radical.radical_id,
        character=radical.character,
        pinyin=radical.pinyin,
        meaning=radical.meaning,
        variants=radical.variants,
        stroke_count=radical.stroke_count,
        mnemonic_tip=radical.mnemonic_tip,
        characters=char_list
    )

@app.get("/graph/data", response_model=schemas.GraphData)
def get_graph_data(hsk_level: int = None, radical_id: int = None, db: Session = Depends(get_db)):
    # 1. Fetch Radicals that have connections
    rad_query = db.query(models.Radical).join(models.character_radical_rel)
    if radical_id:
        rad_query = rad_query.filter(models.Radical.radical_id == radical_id)
    radicals = rad_query.all()
    
    # 2. Fetch Characters that have connections
    char_query = db.query(models.Character).join(models.character_radical_rel)
    if hsk_level:
        char_query = char_query.filter(models.Character.hsk_level == hsk_level)
    if radical_id:
        char_query = char_query.filter(models.character_radical_rel.c.radical_id == radical_id)
    characters = char_query.all()
    
    # 3. Fetch Links
    link_query = db.query(models.character_radical_rel)
    if radical_id:
        link_query = link_query.filter(models.character_radical_rel.c.radical_id == radical_id)
    stmt = link_query.all()
    
    nodes = []
    seen_nodes = set()
    char_ids = {c.char_id for c in characters}
    
    for rad in radicals:
        node_id = f"rad-{rad.radical_id}"
        if node_id not in seen_nodes:
            nodes.append(schemas.GraphNode(
                id=node_id,
                label=rad.character,
                type="radical",
                meaning=rad.meaning,
                pinyin=rad.pinyin,
                stroke_count=rad.stroke_count
            ))
            seen_nodes.add(node_id)
            
    for char in characters:
        node_id = f"char-{char.char_id}"
        if node_id not in seen_nodes:
            nodes.append(schemas.GraphNode(
                id=node_id,
                label=char.hanzi,
                type="character",
                meaning=char.meaning_vi or char.explanation,
                pinyin=char.pinyin,
                hsk_level=char.hsk_level,
                stroke_count=char.stroke_count
            ))
            seen_nodes.add(node_id)
            
    links = [
        schemas.GraphLink(source=f"rad-{row.radical_id}", target=f"char-{row.char_id}")
        for row in stmt
        if row.char_id in char_ids
    ]
    
    return schemas.GraphData(nodes=nodes, links=links)

# --- LEADERBOARD ENDPOINTS ---

@app.get("/api/leaderboard/progress")
def get_progress_leaderboard(
    limit: int = 50,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leaderboard based on learning progress (XP)."""
    # Get top users by XP
    users = db.query(models.User).order_by(models.User.xp.desc()).limit(limit).all()
    
    entries = []
    for idx, u in enumerate(users, 1):
        # Count words learned
        words_learned = db.query(func.count(models.UserVocabulary.id)).filter(
            models.UserVocabulary.user_id == u.user_id
        ).scalar() or 0
        
        entries.append({
            "rank": idx,
            "user_id": u.user_id,
            "username": u.username,
            "avatar_url": u.avatar_url,
            "xp": u.xp or 0,
            "streak": u.streak or 0,
            "words_learned": words_learned,
            "elo_rating": u.elo_rating or 1200
        })
    
    # Find current user's rank
    my_rank = None
    my_entry = None
    
    # Count how many users have higher XP
    higher_count = db.query(func.count(models.User.user_id)).filter(
        models.User.xp > (current_user.xp or 0)
    ).scalar() or 0
    my_rank = higher_count + 1
    
    my_words = db.query(func.count(models.UserVocabulary.id)).filter(
        models.UserVocabulary.user_id == current_user.user_id
    ).scalar() or 0
    
    my_entry = {
        "rank": my_rank,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "avatar_url": current_user.avatar_url,
        "xp": current_user.xp or 0,
        "streak": current_user.streak or 0,
        "words_learned": my_words,
        "elo_rating": current_user.elo_rating or 1200
    }
    
    return {"entries": entries, "my_rank": my_rank, "my_entry": my_entry}

@app.get("/api/leaderboard/elo")
def get_elo_leaderboard(
    limit: int = 50,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Leaderboard based on Elo rating from games."""
    # Get top users by Elo
    users = db.query(models.User).order_by(models.User.elo_rating.desc()).limit(limit).all()
    
    entries = []
    for idx, u in enumerate(users, 1):
        # Count wins, losses, draws
        wins = db.query(func.count(models.GameResult.result_id)).filter(
            models.GameResult.winner_id == u.user_id,
            models.GameResult.is_draw == False
        ).scalar() or 0
        
        losses = db.query(func.count(models.GameResult.result_id)).filter(
            models.GameResult.loser_id == u.user_id,
            models.GameResult.is_draw == False
        ).scalar() or 0
        
        draws = db.query(func.count(models.GameResult.result_id)).filter(
            (models.GameResult.winner_id == u.user_id) | (models.GameResult.loser_id == u.user_id),
            models.GameResult.is_draw == True
        ).scalar() or 0
        
        games_played = wins + losses + draws
        win_rate = round((wins / games_played * 100), 1) if games_played > 0 else 0.0
        
        entries.append({
            "rank": idx,
            "user_id": u.user_id,
            "username": u.username,
            "avatar_url": u.avatar_url,
            "elo_rating": u.elo_rating or 1200,
            "games_played": games_played,
            "wins": wins,
            "losses": losses,
            "draws": draws,
            "win_rate": win_rate
        })
    
    # Find current user's rank
    higher_count = db.query(func.count(models.User.user_id)).filter(
        models.User.elo_rating > (current_user.elo_rating or 1200)
    ).scalar() or 0
    my_rank = higher_count + 1
    
    # Current user's stats
    my_wins = db.query(func.count(models.GameResult.result_id)).filter(
        models.GameResult.winner_id == current_user.user_id,
        models.GameResult.is_draw == False
    ).scalar() or 0
    
    my_losses = db.query(func.count(models.GameResult.result_id)).filter(
        models.GameResult.loser_id == current_user.user_id,
        models.GameResult.is_draw == False
    ).scalar() or 0
    
    my_draws = db.query(func.count(models.GameResult.result_id)).filter(
        (models.GameResult.winner_id == current_user.user_id) | (models.GameResult.loser_id == current_user.user_id),
        models.GameResult.is_draw == True
    ).scalar() or 0
    
    my_games = my_wins + my_losses + my_draws
    my_wr = round((my_wins / my_games * 100), 1) if my_games > 0 else 0.0
    
    my_entry = {
        "rank": my_rank,
        "user_id": current_user.user_id,
        "username": current_user.username,
        "avatar_url": current_user.avatar_url,
        "elo_rating": current_user.elo_rating or 1200,
        "games_played": my_games,
        "wins": my_wins,
        "losses": my_losses,
        "draws": my_draws,
        "win_rate": my_wr
    }
    
    return {"entries": entries, "my_rank": my_rank, "my_entry": my_entry}

