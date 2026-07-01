from sqladmin import ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from .auth import verify_password, get_password_hash
from .models import (
    User, Role, Radical, Character, Vocabulary, 
    Topic, LessonItem, WritingPractice, ChatMessage, UserDailyStats, UserVocabulary,
    Post, Comment, Tag, GameResult
)
from wtforms import StringField, PasswordField

class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        username, password = form.get("username"), form.get("password")
        
        from .database import SessionLocal
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            if not user or not verify_password(password, user.password_hash):
                return False
            
            if user.role_id != 1:
                return False
                
            request.session.update({"token": username})
            return True
        finally:
            db.close()

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        token = request.session.get("token")
        if not token:
            return False
        
        from .database import SessionLocal
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == token).first()
            return user is not None and user.role_id == 1
        finally:
            db.close()


class UserAdmin(ModelView, model=User):
    column_list = [User.user_id, User.username, User.email, User.role, User.xp, User.streak, User.elo_rating, User.hsk_target, User.created_at]
    column_searchable_list = [User.username, User.email]
    column_sortable_list = [User.user_id, User.created_at, User.xp, User.elo_rating, User.streak]
    column_default_sort = (User.user_id, False)
    column_labels = {
        User.user_id: "ID",
        User.username: "Tên đăng nhập",
        User.email: "Email",
        User.role: "Vai trò",
        User.xp: "XP",
        User.streak: "Chuỗi ngày",
        User.elo_rating: "Elo",
        User.hsk_target: "HSK mục tiêu",
        User.created_at: "Ngày tạo",
    }
    # Hide password_hash and raw role_id from forms (role is set via dropdown)
    form_excluded_columns = [User.password_hash, User.role_id, User.last_study_date, User.created_at]
    # Add a password field for creating/editing users
    form_extra_fields = {
        "password": PasswordField("Mật khẩu (bắt buộc khi tạo mới, để trống nếu không đổi)")
    }
    
    async def on_model_change(self, data, model, is_created, request):
        password = data.get("password")
        if password:
            model.password_hash = get_password_hash(password)
        elif is_created:
            raise ValueError("Phải nhập mật khẩu khi tạo user mới!")
    
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"
    page_size = 20

class RoleAdmin(ModelView, model=Role):
    column_list = [Role.role_id, Role.role_name]
    column_labels = {
        Role.role_id: "ID",
        Role.role_name: "Tên vai trò",
    }
    name = "Role"
    name_plural = "Roles"
    icon = "fa-solid fa-users-cog"

class RadicalAdmin(ModelView, model=Radical):
    column_list = [Radical.radical_id, Radical.character, Radical.pinyin, Radical.meaning, Radical.stroke_count]
    column_searchable_list = [Radical.character, Radical.pinyin, Radical.meaning]
    column_sortable_list = [Radical.radical_id, Radical.stroke_count]
    column_labels = {
        Radical.radical_id: "ID",
        Radical.character: "Bộ thủ",
        Radical.pinyin: "Pinyin",
        Radical.meaning: "Nghĩa",
        Radical.stroke_count: "Số nét",
    }
    name = "Radical (Bộ thủ)"
    name_plural = "Radicals (Bộ thủ)"
    icon = "fa-solid fa-language"
    page_size = 20

class CharacterAdmin(ModelView, model=Character):
    column_list = [Character.char_id, Character.hanzi, Character.pinyin, Character.meaning_vi, Character.hsk_level, Character.stroke_count]
    column_searchable_list = [Character.hanzi, Character.pinyin, Character.meaning_vi]
    column_sortable_list = [Character.char_id, Character.hsk_level, Character.stroke_count]
    column_labels = {
        Character.char_id: "ID",
        Character.hanzi: "Hán tự",
        Character.pinyin: "Pinyin",
        Character.meaning_vi: "Nghĩa tiếng Việt",
        Character.hsk_level: "HSK",
        Character.stroke_count: "Số nét",
    }
    name = "Character (Hán tự)"
    name_plural = "Characters (Hán tự)"
    icon = "fa-solid fa-pen-nib"
    page_size = 20

class VocabularyAdmin(ModelView, model=Vocabulary):
    column_list = [Vocabulary.vocab_id, Vocabulary.word, Vocabulary.pinyin, Vocabulary.meaning_vi, Vocabulary.meaning_en, Vocabulary.hsk_level]
    column_searchable_list = [Vocabulary.word, Vocabulary.pinyin, Vocabulary.meaning_vi, Vocabulary.meaning_en]
    column_sortable_list = [Vocabulary.vocab_id, Vocabulary.hsk_level]
    column_labels = {
        Vocabulary.vocab_id: "ID",
        Vocabulary.word: "Từ",
        Vocabulary.pinyin: "Pinyin",
        Vocabulary.meaning_vi: "Nghĩa tiếng Việt",
        Vocabulary.meaning_en: "Nghĩa tiếng Anh",
        Vocabulary.hsk_level: "HSK",
    }
    name = "Vocabulary (Từ vựng)"
    name_plural = "Vocabulary (Từ vựng)"
    icon = "fa-solid fa-book"
    page_size = 20

class TopicAdmin(ModelView, model=Topic):
    column_list = [Topic.topic_id, Topic.icon_url, Topic.title, Topic.description, Topic.hsk_level]
    column_searchable_list = [Topic.title, Topic.description]
    column_sortable_list = [Topic.topic_id, Topic.hsk_level]
    # Don't include lesson_items in the form - manage them via LessonItem admin instead
    form_columns = [Topic.title, Topic.description, Topic.icon_url, Topic.hsk_level]
    column_labels = {
        Topic.topic_id: "ID",
        Topic.icon_url: "Icon",
        Topic.title: "Tiêu đề",
        Topic.description: "Mô tả",
        Topic.hsk_level: "HSK",
    }
    name = "Topic (Chủ đề)"
    name_plural = "Topics (Chủ đề)"
    icon = "fa-solid fa-layer-group"
    page_size = 20

class LessonItemAdmin(ModelView, model=LessonItem):
    column_list = [LessonItem.item_id, LessonItem.topic, LessonItem.vocabulary, LessonItem.character]
    # Use relationships for forms (dropdown selectors instead of raw IDs)
    form_columns = [LessonItem.topic, LessonItem.vocabulary, LessonItem.character]
    column_sortable_list = [LessonItem.item_id]
    column_labels = {
        LessonItem.item_id: "ID",
        LessonItem.topic: "Chủ đề",
        LessonItem.vocabulary: "Từ vựng",
        LessonItem.character: "Hán tự",
    }
    name = "Lesson Item (Nội dung bài)"
    name_plural = "Lesson Items (Nội dung bài)"
    icon = "fa-solid fa-list-ol"
    page_size = 25

class WritingPracticeAdmin(ModelView, model=WritingPractice):
    # Use relationships instead of raw user_id/char_id
    column_list = [WritingPractice.practice_id, WritingPractice.user, WritingPractice.character, WritingPractice.confidence_score, WritingPractice.practice_date]
    column_sortable_list = [WritingPractice.practice_id, WritingPractice.confidence_score, WritingPractice.practice_date]
    # Exclude raw FK columns from form, use relationship dropdowns
    form_excluded_columns = [WritingPractice.user_id, WritingPractice.char_id]
    column_labels = {
        WritingPractice.practice_id: "ID",
        WritingPractice.user: "Người dùng",
        WritingPractice.character: "Hán tự",
        WritingPractice.confidence_score: "Điểm",
        WritingPractice.practice_date: "Ngày luyện",
    }
    name = "Writing Practice"
    name_plural = "Writing Practices"
    icon = "fa-solid fa-pencil"
    page_size = 20

class ChatMessageAdmin(ModelView, model=ChatMessage):
    # Use user relationship instead of raw user_id
    column_list = [ChatMessage.message_id, ChatMessage.user, ChatMessage.role, ChatMessage.content, ChatMessage.created_at]
    column_sortable_list = [ChatMessage.message_id, ChatMessage.created_at]
    form_excluded_columns = [ChatMessage.user_id]
    column_labels = {
        ChatMessage.message_id: "ID",
        ChatMessage.user: "Người dùng",
        ChatMessage.role: "Vai trò",
        ChatMessage.content: "Nội dung",
        ChatMessage.created_at: "Thời gian",
    }
    name = "Chat Message"
    name_plural = "Chat Messages"
    icon = "fa-solid fa-comments"
    page_size = 20

class UserDailyStatsAdmin(ModelView, model=UserDailyStats):
    # Use user relationship instead of raw user_id
    column_list = [UserDailyStats.stats_id, UserDailyStats.user, UserDailyStats.study_date, UserDailyStats.minutes_spent, UserDailyStats.chars_learned]
    column_sortable_list = [UserDailyStats.stats_id, UserDailyStats.study_date]
    form_excluded_columns = [UserDailyStats.user_id]
    column_labels = {
        UserDailyStats.stats_id: "ID",
        UserDailyStats.user: "Người dùng",
        UserDailyStats.study_date: "Ngày học",
        UserDailyStats.minutes_spent: "Phút",
        UserDailyStats.chars_learned: "Chữ đã học",
    }
    name = "Daily Stat"
    name_plural = "Daily Stats"
    icon = "fa-solid fa-chart-line"
    page_size = 20

class UserVocabularyAdmin(ModelView, model=UserVocabulary):
    # Use relationships instead of raw user_id/vocab_id
    column_list = [UserVocabulary.id, UserVocabulary.user, UserVocabulary.vocabulary, UserVocabulary.srs_level, UserVocabulary.next_review, UserVocabulary.times_reviewed]
    column_sortable_list = [UserVocabulary.id, UserVocabulary.srs_level, UserVocabulary.next_review]
    form_excluded_columns = [UserVocabulary.user_id, UserVocabulary.vocab_id]
    column_labels = {
        UserVocabulary.id: "ID",
        UserVocabulary.user: "Người dùng",
        UserVocabulary.vocabulary: "Từ vựng",
        UserVocabulary.srs_level: "SRS Level",
        UserVocabulary.next_review: "Ôn tập tiếp",
        UserVocabulary.times_reviewed: "Số lần ôn",
    }
    name = "User Vocabulary (SRS)"
    name_plural = "User Vocabularies"
    icon = "fa-solid fa-brain"
    page_size = 20

class PostAdmin(ModelView, model=Post):
    # Use author relationship instead of raw user_id
    column_list = [Post.post_id, Post.title, Post.author, Post.likes, Post.created_at]
    column_searchable_list = [Post.title]
    column_sortable_list = [Post.post_id, Post.likes, Post.created_at]
    form_excluded_columns = [Post.user_id, Post.priority_score]
    column_labels = {
        Post.post_id: "ID",
        Post.title: "Tiêu đề",
        Post.author: "Tác giả",
        Post.likes: "Lượt thích",
        Post.created_at: "Ngày tạo",
    }
    name = "Post (Bài viết)"
    name_plural = "Posts (Bài viết)"
    icon = "fa-solid fa-newspaper"
    page_size = 20

class CommentAdmin(ModelView, model=Comment):
    # Use post and author relationships instead of raw IDs
    column_list = [Comment.comment_id, Comment.post, Comment.author, Comment.content, Comment.created_at]
    column_sortable_list = [Comment.comment_id, Comment.created_at]
    form_excluded_columns = [Comment.post_id, Comment.user_id]
    column_labels = {
        Comment.comment_id: "ID",
        Comment.post: "Bài viết",
        Comment.author: "Người viết",
        Comment.content: "Nội dung",
        Comment.created_at: "Thời gian",
    }
    name = "Comment (Bình luận)"
    name_plural = "Comments (Bình luận)"
    icon = "fa-solid fa-comment"
    page_size = 20

class TagAdmin(ModelView, model=Tag):
    column_list = [Tag.tag_id, Tag.name]
    column_searchable_list = [Tag.name]
    column_labels = {
        Tag.tag_id: "ID",
        Tag.name: "Tên tag",
    }
    name = "Tag"
    name_plural = "Tags"
    icon = "fa-solid fa-tag"

class GameResultAdmin(ModelView, model=GameResult):
    # Use winner/loser relationships instead of raw IDs
    column_list = [GameResult.result_id, GameResult.room_id, GameResult.winner, GameResult.loser, GameResult.winner_score, GameResult.loser_score, GameResult.elo_change, GameResult.is_draw, GameResult.played_at]
    column_sortable_list = [GameResult.result_id, GameResult.played_at]
    form_excluded_columns = [GameResult.winner_id, GameResult.loser_id]
    column_labels = {
        GameResult.result_id: "ID",
        GameResult.room_id: "Phòng",
        GameResult.winner: "Người thắng",
        GameResult.loser: "Người thua",
        GameResult.winner_score: "Điểm thắng",
        GameResult.loser_score: "Điểm thua",
        GameResult.elo_change: "Elo +/-",
        GameResult.is_draw: "Hòa?",
        GameResult.played_at: "Thời gian",
    }
    name = "Game Result"
    name_plural = "Game Results"
    icon = "fa-solid fa-gamepad"
    page_size = 20

def setup_admin(admin):
    admin.add_view(UserAdmin)
    admin.add_view(RoleAdmin)
    admin.add_view(RadicalAdmin)
    admin.add_view(CharacterAdmin)
    admin.add_view(VocabularyAdmin)
    admin.add_view(TopicAdmin)
    admin.add_view(LessonItemAdmin)
    admin.add_view(WritingPracticeAdmin)
    admin.add_view(ChatMessageAdmin)
    admin.add_view(UserDailyStatsAdmin)
    admin.add_view(UserVocabularyAdmin)
    admin.add_view(PostAdmin)
    admin.add_view(CommentAdmin)
    admin.add_view(TagAdmin)
    admin.add_view(GameResultAdmin)
