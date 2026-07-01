# 🀄 LingoByte — Ứng dụng học tiếng Trung thông minh

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/SQL%20Server-CC2927?style=for-the-badge&logo=microsoftsqlserver&logoColor=white" />
  <img src="https://img.shields.io/badge/TailwindCSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

## 📖 Giới thiệu

**LingoByte** là ứng dụng web hỗ trợ học tiếng Trung (Hán ngữ) theo chuẩn HSK, được xây dựng như đồ án cơ sở. Ứng dụng tích hợp nhiều phương pháp học hiện đại: thẻ ghi nhớ (flashcards), hệ thống SRS (Spaced Repetition System), luyện viết câu, từ điển, đồ thị bộ thủ, mini game, cộng đồng, chat AI, và nhiều tính năng khác.

## ✨ Tính năng chính

| Tính năng | Mô tả |
|---|---|
| 📚 **Bài học theo chủ đề** | Học từ vựng theo từng chủ đề HSK 1-6 |
| 🃏 **Thẻ ghi nhớ (Flashcards)** | Ôn tập từ vựng với hệ thống SRS thông minh |
| ✍️ **Luyện viết câu** | Điền từ vào câu với gợi ý autocomplete |
| 📖 **Từ điển** | Tra cứu từ vựng tiếng Trung - Việt |
| 🔤 **214 Bộ thủ** | Khám phá bộ thủ và mối quan hệ giữa các chữ Hán |
| 🕸️ **Đồ thị Bộ thủ** | Trực quan hóa mối liên hệ giữa bộ thủ và chữ Hán |
| ✏️ **Luyện viết tay** | Nhận diện chữ viết tay tiếng Trung |
| 🎮 **Mini Game** | Trò chơi ghép bộ thủ đối kháng realtime |
| 🏆 **Bảng xếp hạng** | Xếp hạng theo XP và ELO |
| 🤖 **AI Chat** | Trò chuyện với AI để luyện tiếng Trung |
| 👥 **Cộng đồng** | Đăng bài, bình luận, chia sẻ kinh nghiệm |
| 💬 **Tin nhắn** | Nhắn tin trực tiếp với bạn bè |
| 👤 **Hồ sơ cá nhân** | Theo dõi tiến độ học tập |
| 🛡️ **Admin Panel** | Quản lý nội dung, người dùng, AI providers |

## 🏗️ Kiến trúc dự án

```
LingoByte/
├── backend/                # Backend API (Python/FastAPI)
│   ├── app/
│   │   ├── api/            # API routers (topics, game, chat, ...)
│   │   ├── services/       # Business logic services
│   │   ├── main.py         # Entry point & core endpoints
│   │   ├── models.py       # SQLAlchemy ORM models
│   │   ├── schemas.py      # Pydantic schemas
│   │   ├── database.py     # Database connection
│   │   ├── auth.py         # Authentication (JWT)
│   │   └── deps.py         # Dependencies
│   ├── requirements.txt
│   └── .env                # Environment variables (không push)
├── frontend/               # Frontend (React/Vite)
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── context/        # React contexts (Auth, Notification)
│   │   ├── App.jsx         # Main app with routing
│   │   └── main.jsx        # Entry point
│   ├── package.json
│   └── tailwind.config.js
├── database/               # Database scripts & seed data
│   ├── setup_database.sql  # SQL Server schema
│   ├── seed_*.py           # Data seeding scripts
│   └── hanzi_data.json     # Character data
├── HUONG_DAN_CHAY.md       # Hướng dẫn chạy dự án
└── README.md
```

## 🛠️ Công nghệ sử dụng

### Backend
- **FastAPI** — Web framework Python hiệu suất cao
- **SQLAlchemy** — ORM cho database
- **SQL Server** — Hệ quản trị CSDL
- **JWT (python-jose)** — Xác thực người dùng
- **scikit-learn** — Machine learning cho nhận diện chữ viết tay

### Frontend
- **React 18** — UI library
- **Vite** — Build tool
- **TailwindCSS** — Utility-first CSS framework
- **Framer Motion** — Animation library
- **Axios** — HTTP client
- **Lucide React** — Icon library

## 🚀 Cài đặt & Chạy

### Yêu cầu
- Python 3.10+
- Node.js 18+
- SQL Server (LocalDB hoặc Express)
- ODBC Driver 17 for SQL Server

### 1. Clone dự án
```bash
git clone https://github.com/KienTrungZir/LingoByte.git
cd LingoByte
```

### 2. Cài đặt Database
```bash
# Chạy file SQL để tạo database và bảng
# Mở SQL Server Management Studio và chạy:
database/setup_database.sql
```

### 3. Cài đặt Backend
```bash
# Tạo virtual environment
python -m venv venv

# Kích hoạt venv
.\venv\Scripts\activate    # Windows
source venv/bin/activate   # macOS/Linux

# Cài đặt thư viện
pip install -r backend/requirements.txt

# Tạo file .env trong thư mục backend/
# DATABASE_URL=mssql+pyodbc://@localhost/HanziEcosystem?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes
# SECRET_KEY=your-secret-key

# Chạy backend
cd backend
uvicorn app.main:app --reload
```
Backend chạy tại: `http://localhost:8000`

### 4. Cài đặt Frontend
```bash
# Mở terminal mới
cd frontend
npm install
npm run dev
```
Frontend chạy tại: `http://localhost:5173`

> ⚠️ **Lưu ý**: Cần chạy cả backend và frontend cùng lúc trên 2 terminal riêng biệt.

## 📸 Screenshots

> *Thêm screenshots tại đây*

## 👨‍💻 Tác giả

- **KienTrungZir** — [GitHub](https://github.com/KienTrungZir)

## 📄 License

Dự án này được phát triển cho mục đích học tập (Đồ án Cơ sở).
