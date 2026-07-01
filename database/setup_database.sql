IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'HanziEcosystem')
BEGIN
    CREATE DATABASE HanziEcosystem;
END
GO

USE HanziEcosystem;
GO

-- 1. Phân hệ Người dùng & Thống kê

CREATE TABLE Roles (
    role_id INT PRIMARY KEY IDENTITY(1,1),
    role_name VARCHAR(20) UNIQUE -- 'admin', 'user'
);

INSERT INTO Roles (role_name) VALUES ('admin'), ('user');

CREATE TABLE Users (
    user_id INT PRIMARY KEY IDENTITY(1,1),
    username NVARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role_id INT DEFAULT 2, -- Mặc định là user
    hsk_target INT CHECK (hsk_target BETWEEN 1 AND 6),
    xp INT DEFAULT 0,
    streak INT DEFAULT 0,
    elo_rating INT DEFAULT 1200,
    avatar_url NVARCHAR(500),
    bio NVARCHAR(255),
    last_login DATETIME,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (role_id) REFERENCES Roles(role_id)
);

-- Thống kê tiến độ hàng ngày (cho Dashboard & Biểu đồ)
CREATE TABLE UserDailyStats (
    stats_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    study_date DATE DEFAULT CAST(GETDATE() AS DATE),
    minutes_spent INT DEFAULT 0,
    chars_learned INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- 2. Phân hệ Học tập & Trình khám phá (Core Learning)

-- Thư viện 214 Bộ thủ
CREATE TABLE Radicals (
    radical_id INT PRIMARY KEY IDENTITY(1,1),
    character NCHAR(1) NOT NULL,
    pinyin VARCHAR(20),
    meaning NVARCHAR(100),
    variants NCHAR(5),
    mnemonic_tip NVARCHAR(MAX), -- Mẹo ghi nhớ
    image_url NVARCHAR(500),
    stroke_count INT
);

-- Từ điển Hán tự (Single Characters)
CREATE TABLE Characters (
    char_id INT PRIMARY KEY IDENTITY(1,1),
    hanzi NCHAR(1) NOT NULL UNIQUE,
    pinyin VARCHAR(50),
    meaning_vi NVARCHAR(255),
    hsk_level INT,
    stroke_count INT,
    explanation NVARCHAR(MAX),
    example_sentence NVARCHAR(MAX)
);

-- Từ điển Từ vựng HSK (Words & Phrases)
CREATE TABLE Vocabulary (
    vocab_id INT PRIMARY KEY IDENTITY(1,1),
    word NVARCHAR(50) NOT NULL,
    pinyin VARCHAR(100),
    meaning_en NVARCHAR(MAX),
    meaning_vi NVARCHAR(MAX),
    hsk_level INT,
    created_at DATETIME DEFAULT GETDATE()
);

-- Mối quan hệ Đồ thị (Radical Graph) - Kết nối bộ thủ vào chữ
CREATE TABLE CharacterRadicalRel (
    char_id INT,
    radical_id INT,
    PRIMARY KEY (char_id, radical_id),
    FOREIGN KEY (char_id) REFERENCES Characters(char_id),
    FOREIGN KEY (radical_id) REFERENCES Radicals(radical_id)
);

-- Bài học theo chủ đề
CREATE TABLE Topics (
    topic_id INT PRIMARY KEY IDENTITY(1,1),
    title NVARCHAR(100),
    description NVARCHAR(255),
    icon_url NVARCHAR(500)
);

CREATE TABLE LessonItems (
    item_id INT PRIMARY KEY IDENTITY(1,1),
    topic_id INT,
    char_id INT,
    FOREIGN KEY (topic_id) REFERENCES Topics(topic_id),
    FOREIGN KEY (char_id) REFERENCES Characters(char_id)
);

-- 3. Phân hệ AI & Luyện tập (AI Features & Practice)

-- Lịch sử luyện viết (Handwriting AI)
CREATE TABLE WritingPractice (
    practice_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    char_id INT,
    confidence_score FLOAT, -- Điểm chính xác từ AI
    user_drawing_path NVARCHAR(500), -- Đường dẫn ảnh vẽ tay
    practice_date DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (char_id) REFERENCES Characters(char_id)
);

-- Genius AI Chat History
CREATE TABLE ChatMessages (
    message_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    role VARCHAR(10), -- 'user' hoặc 'assistant'
    content NVARCHAR(MAX),
    is_voice BIT DEFAULT 0, -- Có phải tin nhắn thoại không
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Hệ thống Thi thử HSK (Mock Test)
CREATE TABLE MockTests (
    test_id INT PRIMARY KEY IDENTITY(1,1),
    title NVARCHAR(100),
    hsk_level INT,
    duration_minutes INT,
    total_questions INT
);

CREATE TABLE TestResults (
    result_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    test_id INT,
    score INT,
    completed_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (test_id) REFERENCES MockTests(test_id)
);

-- 4. Phân hệ Cộng đồng & Tương tác (Social)

CREATE TABLE Posts (
    post_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    title NVARCHAR(255),
    content NVARCHAR(MAX),
    likes_count INT DEFAULT 0,
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

CREATE TABLE Comments (
    comment_id INT PRIMARY KEY IDENTITY(1,1),
    post_id INT,
    user_id INT,
    content NVARCHAR(MAX),
    created_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (post_id) REFERENCES Posts(post_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- Hệ thống Bạn bè
CREATE TABLE Friends (
    user_id INT,
    friend_id INT,
    status VARCHAR(20), -- 'pending', 'accepted'
    created_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (user_id, friend_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (friend_id) REFERENCES Users(user_id)
);

-- Bảng xếp hạng (Rankings)
CREATE TABLE Rankings (
    rank_id INT PRIMARY KEY IDENTITY(1,1),
    user_id INT,
    category VARCHAR(20), -- 'weekly', 'monthly', 'global'
    current_score INT,
    updated_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (user_id) REFERENCES Users(user_id)
);

-- 5. Phân hệ Quản trị (Admin & Achievement)

CREATE TABLE Badges (
    badge_id INT PRIMARY KEY IDENTITY(1,1),
    badge_name NVARCHAR(100),
    description NVARCHAR(255),
    icon_url NVARCHAR(500)
);

CREATE TABLE UserBadges (
    user_id INT,
    badge_id INT,
    earned_at DATETIME DEFAULT GETDATE(),
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (badge_id) REFERENCES Badges(badge_id)
);

CREATE TABLE AdminLogs (
    log_id INT PRIMARY KEY IDENTITY(1,1),
    admin_id INT,
    action NVARCHAR(100),
    target_table VARCHAR(50),
    action_details NVARCHAR(MAX),
    action_time DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (admin_id) REFERENCES Users(user_id)
);

-- 6. Kết quả Game & Elo
CREATE TABLE GameResults (
    result_id INT PRIMARY KEY IDENTITY(1,1),
    room_id VARCHAR(20),
    winner_id INT,
    loser_id INT,
    winner_score INT DEFAULT 0,
    loser_score INT DEFAULT 0,
    elo_change INT DEFAULT 0,
    is_draw BIT DEFAULT 0,
    played_at DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (winner_id) REFERENCES Users(user_id),
    FOREIGN KEY (loser_id) REFERENCES Users(user_id)
);

-- Index tối ưu truy vấn
CREATE INDEX IX_Char_Hanzi ON Characters(hanzi);
CREATE INDEX IX_Char_Pinyin ON Characters(pinyin);
CREATE INDEX IX_Ranking_Category_Score ON Rankings(category, current_score DESC);
CREATE INDEX IX_Posts_Date ON Posts(created_at DESC);
CREATE INDEX IX_GameResults_Winner ON GameResults(winner_id);
CREATE INDEX IX_GameResults_Loser ON GameResults(loser_id);
CREATE INDEX IX_Users_Elo ON Users(elo_rating DESC);
CREATE INDEX IX_Users_XP ON Users(xp DESC);
