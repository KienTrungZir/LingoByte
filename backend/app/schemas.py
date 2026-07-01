from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, date

class CharacterBase(BaseModel):
    hanzi: str
    pinyin: Optional[str] = None
    meaning_vi: Optional[str] = None
    hsk_level: Optional[int] = None
    stroke_count: Optional[int] = None

class CharacterDetail(CharacterBase):
    char_id: int
    explanation: Optional[str] = None
    example_sentence: Optional[str] = None

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserProfile(UserBase):
    user_id: int
    xp: int
    streak: int
    role_id: int
    hsk_target: Optional[int]
    avatar_url: Optional[str]
    bio: Optional[str]
    elo_rating: Optional[int] = 1200

    class Config:
        from_attributes = True

class PublicProfile(BaseModel):
    user_id: int
    username: str
    role_id: int
    xp: int
    streak: int
    elo_rating: int
    hsk_target: Optional[int] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    created_at: datetime
    is_online: bool = False
    
    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    hsk_target: Optional[int] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class StatsUpdate(BaseModel):
    minutes_spent: int
    chars_learned: int

class VocabularyBase(BaseModel):
    word: str
    pinyin: Optional[str] = None
    meaning_en: Optional[str] = None
    meaning_vi: Optional[str] = None
    example_sentence: Optional[str] = None
    hsk_level: Optional[int] = None

class VocabularyResult(VocabularyBase):
    vocab_id: int
    
    class Config:
        from_attributes = True # Using V2 from_attributes instead of orm_mode

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class GraphNode(BaseModel):
    id: str
    label: str
    type: str
    meaning: Optional[str] = None
    pinyin: Optional[str] = None
    stroke_count: Optional[int] = None
    hsk_level: Optional[int] = None
    mnemonic_tip: Optional[str] = None

class GraphLink(BaseModel):
    source: str
    target: str

class GraphData(BaseModel):
    nodes: List[GraphNode]
    links: List[GraphLink]

class UserVocabularyBase(BaseModel):
    vocab_id: int
    srs_level: int
    next_review: datetime
    last_reviewed: Optional[datetime] = None

class UserVocabularyResult(UserVocabularyBase):
    id: int
    vocabulary: VocabularyResult

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    xp: int
    streak: int
    hsk_target: int
    words_learned: int
    words_total: int
    progress_percentage: float
    review_count: int
    upcoming_reviews: List[UserVocabularyResult] = []

class SRSRecord(BaseModel):
    vocab_id: int
    success: bool # True if the user got it right

class RadicalBase(BaseModel):
    radical_id: int
    character: str
    pinyin: Optional[str] = None
    meaning: Optional[str] = None
    variants: Optional[str] = None
    stroke_count: Optional[int] = None
    mnemonic_tip: Optional[str] = None

    class Config:
        from_attributes = True

class RadicalCharacter(BaseModel):
    char_id: int
    hanzi: str
    pinyin: Optional[str] = None
    meaning_vi: Optional[str] = None
    hsk_level: Optional[int] = None

    class Config:
        from_attributes = True

class RadicalDetail(RadicalBase):
    characters: List[RadicalCharacter] = []

class RadicalStats(BaseModel):
    total_radicals: int
    total_characters: int
    total_links: int
    stroke_groups: dict

class TopicBase(BaseModel):
    title: str
    description: Optional[str] = None
    icon_url: Optional[str] = None
    hsk_level: Optional[int] = None

class Topic(TopicBase):
    topic_id: int
    
    class Config:
        from_attributes = True

class LessonItemBase(BaseModel):
    topic_id: int
    char_id: Optional[int] = None
    vocab_id: Optional[int] = None

class LessonItem(LessonItemBase):
    item_id: int
    character: Optional[CharacterDetail] = None
    vocabulary: Optional[VocabularyResult] = None
    
    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    content: str
    role: str = "user"

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    message_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    post_id: int

class Comment(CommentBase):
    comment_id: int
    post_id: int
    user_id: int
    created_at: datetime
    author: Optional[UserProfile] = None

    class Config:
        from_attributes = True

class PostBase(BaseModel):
    title: str
    content: str

class PostCreate(PostBase):
    pass

class Post(PostBase):
    post_id: int
    user_id: int
    likes: int = 0
    shares: int = 0
    priority_score: float = 0.0
    created_at: datetime
    author: Optional[UserProfile] = None
    comments: List[Comment] = []
    tags: List['Tag'] = []

    class Config:
        from_attributes = True

class TagBase(BaseModel):
    name: str

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    tag_id: int
    
    class Config:
        from_attributes = True

class HandwritingSubmission(BaseModel):
    target_char: str
    strokes: List[List[List[float]]] # [[[x,y], ...], ...]

class WritingPracticeCreate(BaseModel):
    char_id: int
    strokes: List[List[List[float]]]

# --- Leaderboard Schemas ---
class ProgressLeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    xp: int
    streak: int
    words_learned: int
    elo_rating: int

    class Config:
        from_attributes = True

class EloLeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    elo_rating: int
    games_played: int
    wins: int
    losses: int
    draws: int
    win_rate: float

    class Config:
        from_attributes = True

class LeaderboardResponse(BaseModel):
    entries: List[dict]
    my_rank: Optional[int] = None
    my_entry: Optional[dict] = None

class FriendshipBase(BaseModel):
    friend_id: int

class FriendshipCreate(FriendshipBase):
    pass

class FriendshipResponse(BaseModel):
    id: int
    user_id: int
    friend_id: int
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class FriendItem(BaseModel):
    friendship_id: int
    user: PublicProfile
    status: str
    is_requester: bool

# --- AI Provider Schemas ---
class AiProviderCreate(BaseModel):
    provider: str      # 'gemini' | 'claude' | 'openai' | 'openrouter'
    api_key: str
    model: str

class AiProviderResponse(BaseModel):
    id: int
    provider: str
    model: str
    is_active: bool
    updated_at: Optional[datetime] = None
    updated_by: Optional[str] = None

    class Config:
        from_attributes = True
