from sqlalchemy import Column, Integer, String, Unicode, DateTime, ForeignKey, Float, Boolean, Date, Text, Table, UnicodeText
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

# Many-to-Many relationship for Character and Radical
character_radical_rel = Table(
    'CharacterRadicalRel',
    Base.metadata,
    Column('char_id', Integer, ForeignKey('Characters.char_id'), primary_key=True),
    Column('radical_id', Integer, ForeignKey('Radicals.radical_id'), primary_key=True)
)

post_tag_rel = Table(
    'PostTagRel',
    Base.metadata,
    Column('post_id', Integer, ForeignKey('Posts.post_id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('Tags.tag_id'), primary_key=True)
)

class Role(Base):
    __tablename__ = "Roles"
    role_id = Column(Integer, primary_key=True, index=True)
    role_name = Column(String(20), unique=True)

    def __str__(self):
        return self.role_name or f"Role {self.role_id}"

class User(Base):
    __tablename__ = "Users"
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role_id = Column(Integer, ForeignKey("Roles.role_id"), default=2)
    hsk_target = Column(Integer)
    
    role = relationship("Role")
    xp = Column(Integer, default=0)
    streak = Column(Integer, default=0)
    elo_rating = Column(Integer, default=1200)
    avatar_url = Column(String(500))
    bio = Column(String(255))
    last_study_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())
    last_active = Column(DateTime)

    def __str__(self):
        return self.username or f"User {self.user_id}"

class UserDailyStats(Base):
    __tablename__ = "UserDailyStats"
    stats_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"))
    study_date = Column(Date, server_default=func.current_date())
    minutes_spent = Column(Integer, default=0)
    chars_learned = Column(Integer, default=0)
    
    user = relationship("User")

    def __str__(self):
        return f"User {self.user_id} - {self.study_date}"

class Radical(Base):
    __tablename__ = "Radicals"
    radical_id = Column(Integer, primary_key=True, index=True)
    character = Column(Unicode(1), nullable=False)
    pinyin = Column(String(20))
    meaning = Column(Unicode(100))
    variants = Column(Unicode(5))
    mnemonic_tip = Column(Text)
    image_url = Column(String(500))
    stroke_count = Column(Integer)
    characters = relationship("Character", secondary=character_radical_rel, back_populates="radicals")

    def __str__(self):
        return f"{self.character} ({self.meaning or self.pinyin or ''})"

class Character(Base):
    __tablename__ = "Characters"
    char_id = Column(Integer, primary_key=True, index=True)
    hanzi = Column(Unicode(1), unique=True, nullable=False)
    pinyin = Column(String(50))
    meaning_vi = Column(Unicode(255))
    hsk_level = Column(Integer)
    stroke_count = Column(Integer)
    explanation = Column(Text)
    example_sentence = Column(Text)
    radicals = relationship("Radical", secondary=character_radical_rel, back_populates="characters")

    def __str__(self):
        return f"{self.hanzi} ({self.pinyin or ''}) - {self.meaning_vi or ''}"

class WritingPractice(Base):
    __tablename__ = "WritingPractice"
    practice_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"))
    char_id = Column(Integer, ForeignKey("Characters.char_id"))
    confidence_score = Column(Float)
    user_drawing_path = Column(String(500))
    practice_date = Column(DateTime, server_default=func.now())
    
    user = relationship("User")
    character = relationship("Character")

    def __str__(self):
        return f"Practice #{self.practice_id} (Score: {self.confidence_score})"

class ChatMessage(Base):
    __tablename__ = "ChatMessages"
    message_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"))
    role = Column(String(10)) # 'user' or 'assistant'
    content = Column(UnicodeText)
    is_voice = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User")

    def __str__(self):
        preview = (self.content or '')[:40]
        return f"[{self.role}] {preview}"

class Vocabulary(Base):
    __tablename__ = "Vocabulary"
    vocab_id = Column(Integer, primary_key=True, index=True)
    word = Column(Unicode(50), nullable=False)
    pinyin = Column(String(100))
    meaning_en = Column(Unicode(4000))
    meaning_vi = Column(Unicode(4000))
    example_sentence = Column(Text, nullable=True)
    hsk_level = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())

    def __str__(self):
        parts = [self.word or '']
        if self.pinyin:
            parts.append(f"({self.pinyin})")
        if self.meaning_vi:
            preview = self.meaning_vi[:30]
            parts.append(f"- {preview}")
        return ' '.join(parts)

class Topic(Base):
    __tablename__ = "Topics"
    topic_id = Column(Integer, primary_key=True, index=True)
    title = Column(Unicode(100))
    description = Column(Unicode(255))
    icon_url = Column(Unicode(500))
    hsk_level = Column(Integer)
    
    lesson_items = relationship("LessonItem", back_populates="topic", cascade="all, delete-orphan")

    def __str__(self):
        return f"{self.title}"

class LessonItem(Base):
    __tablename__ = "LessonItems"
    item_id = Column(Integer, primary_key=True, index=True)
    topic_id = Column(Integer, ForeignKey("Topics.topic_id"))
    char_id = Column(Integer, ForeignKey("Characters.char_id"), nullable=True)
    vocab_id = Column(Integer, ForeignKey("Vocabulary.vocab_id"), nullable=True)
    
    topic = relationship("Topic", back_populates="lesson_items")
    character = relationship("Character")
    vocabulary = relationship("Vocabulary")

    def __str__(self):
        if self.vocabulary:
            return f"Vocab: {self.vocabulary.word}"
        if self.character:
            return f"Char: {self.character.hanzi}"
        return f"Item {self.item_id}"

class UserVocabulary(Base):
    __tablename__ = "UserVocabulary"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"))
    vocab_id = Column(Integer, ForeignKey("Vocabulary.vocab_id"))
    srs_level = Column(Integer, default=0) # 0: New, 1: Learning, 2: Reviewing, 3: Mastered
    next_review = Column(DateTime, server_default=func.now())
    last_reviewed = Column(DateTime)
    times_reviewed = Column(Integer, default=0)
    
    user = relationship("User")
    vocabulary = relationship("Vocabulary")

    def __str__(self):
        srs_labels = {0: 'Mới', 1: 'Đang học', 2: 'Đang ôn', 3: 'Thành thạo'}
        label = srs_labels.get(self.srs_level, str(self.srs_level))
        return f"User {self.user_id} - Vocab {self.vocab_id} [{label}]"

class Post(Base):
    __tablename__ = "Posts"
    post_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"))
    title = Column(Unicode(255), nullable=False)
    content = Column(UnicodeText, nullable=False)
    likes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    priority_score = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=func.now())
    
    author = relationship("User")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary=post_tag_rel, back_populates="posts")

    def __str__(self):
        return f"{self.title[:50]}" if self.title else f"Post {self.post_id}"

class Comment(Base):
    __tablename__ = "Comments"
    comment_id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("Posts.post_id"))
    user_id = Column(Integer, ForeignKey("Users.user_id"))
    content = Column(UnicodeText, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    post = relationship("Post", back_populates="comments")
    author = relationship("User")

    def __str__(self):
        preview = (self.content or '')[:40]
        return f"Comment #{self.comment_id}: {preview}"

class Tag(Base):
    __tablename__ = "Tags"
    tag_id = Column(Integer, primary_key=True, index=True)
    name = Column(Unicode(50), unique=True, nullable=False)
    
    posts = relationship("Post", secondary=post_tag_rel, back_populates="tags")

    def __str__(self):
        return self.name or f"Tag {self.tag_id}"

class GameResult(Base):
    __tablename__ = "GameResults"
    result_id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String(20))
    winner_id = Column(Integer, ForeignKey("Users.user_id"), nullable=True)
    loser_id = Column(Integer, ForeignKey("Users.user_id"), nullable=True)
    winner_score = Column(Integer, default=0)
    loser_score = Column(Integer, default=0)
    elo_change = Column(Integer, default=0)
    is_draw = Column(Boolean, default=False)
    played_at = Column(DateTime, server_default=func.now())
    
    winner = relationship("User", foreign_keys=[winner_id])
    loser = relationship("User", foreign_keys=[loser_id])

    def __str__(self):
        if self.is_draw:
            return f"Game #{self.result_id} - Draw ({self.winner_score}:{self.loser_score})"
        return f"Game #{self.result_id} - {self.winner_score}:{self.loser_score}"

class Friendship(Base):
    __tablename__ = "Friendships"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False)
    friend_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False)
    status = Column(String(20), default="pending") # pending, accepted
    created_at = Column(DateTime, server_default=func.now())
    
    user = relationship("User", foreign_keys=[user_id])
    friend = relationship("User", foreign_keys=[friend_id])

    def __str__(self):
        return f"Friendship {self.user_id} - {self.friend_id} ({self.status})"

class DirectMessage(Base):
    __tablename__ = "DirectMessages"
    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("Users.user_id"), nullable=False)
    content = Column(UnicodeText, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

    def __str__(self):
        preview = (self.content or '')[:40]
        return f"DM {self.sender_id}->{self.receiver_id}: {preview}"

class AiProviderSetting(Base):
    __tablename__ = "AiProviderSettings"
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(20), nullable=False)  # 'gemini' | 'claude' | 'openai' | 'openrouter'
    api_key = Column(String(500), nullable=False)   # base64 encoded
    model = Column(String(100), nullable=False)     # e.g. 'gemini-2.0-flash', 'gpt-4o-mini'
    is_active = Column(Boolean, default=False)
    updated_at = Column(DateTime, server_default=func.now())
    updated_by = Column(String(100))                # admin username

    def __str__(self):
        status = '✅ Active' if self.is_active else '❌ Inactive'
        return f"{self.provider} · {self.model} [{status}]"

