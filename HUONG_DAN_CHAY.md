# Hướng Dẫn Chạy Dự Án (DoAnCoSo)

Dự án này bao gồm 2 phần chính: Backend (Python/FastAPI) và Frontend (React/Vite).

## 1. Chạy Backend (FastAPI)

Mở một terminal (Command Prompt hoặc PowerShell) mới và chạy các lệnh sau:

```bash
# 1. Di chuyển vào thư mục gốc của dự án
cd d:\MyProject\DoAnCoSo

# 2. Kích hoạt môi trường ảo (Virtual Environment)
.\venv\Scripts\activate

# 3. Di chuyển vào thư mục backend
cd backend

# 4. Khởi động server FastAPI
uvicorn app.main:app --reload
```
Server backend sẽ chạy tại: `http://localhost:8000`

## 2. Chạy Frontend (React/Vite)

Mở một terminal (Command Prompt hoặc PowerShell) **mới khác** và chạy các lệnh sau:

```bash
# 1. Di chuyển vào thư mục gốc của dự án
cd d:\MyProject\DoAnCoSo

# 2. Di chuyển vào thư mục frontend
cd frontend

# 3. Cài đặt các thư viện (nếu bạn chưa cài trước đó)
npm install

# 4. Khởi động giao diện web
npm run dev
```
Giao diện frontend sẽ chạy tại: `http://localhost:5173` (bạn có thể xem đường dẫn cụ thể hiển thị trên terminal).

---
**Lưu ý quan trọng**: 
- Bạn cần phải giữ cho cả 2 terminal chạy song song cùng lúc thì frontend mới có thể gọi API tới backend.
- Môi trường ảo (`venv`) đã được tạo sẵn trong thư mục gốc. Nếu bạn gặp lỗi khi dùng `uvicorn`, hãy chắc chắn bạn đã chạy lệnh `.\venv\Scripts\activate` thành công.
