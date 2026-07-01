import pyodbc
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="../backend/.env")
DATABASE_URL = os.getenv("DATABASE_URL")

def get_conn():
    load_dotenv(dotenv_path="../backend/.env")
    DATABASE_URL = os.getenv("DATABASE_URL")
    # Convert sqlalchemy URL to pyodbc connection string
    import urllib.parse
    from sqlalchemy import make_url
    url = make_url(DATABASE_URL)
    driver = url.query.get("driver")
    trusted = url.query.get("Trusted_Connection")
    database = url.database
    host = url.host
    conn_str = f"DRIVER={{{driver}}};SERVER={host};DATABASE={database};Trusted_Connection={trusted}"
    return pyodbc.connect(conn_str)

hsk1_vi = {
    "我": "tôi, mình", "我们": "chúng tôi, chúng ta", "你": "bạn, anh, chị", "您": "ngài, ông, bà (kính trọng)", 
    "他": "anh ấy, ông ấy", "她": "cô ấy, bà ấy", "它": "nó", "这": "đây, này", "那": "kia, đó", "哪": "nào, đâu",
    "谁": "ai", "什么": "cái gì", "多少": "bao nhiêu", "几": "mấy", "怎么": "thế nào", "怎么样": "như thế nào",
    "一": "một", "二": "hai", "三": "ba", "四": "bốn", "五": "năm", "六": "sáu", "七": "bảy", "八": "tám", "九": "chín", "十": "mười",
    "零": "không", "个": "cái (lượng từ phổ biến)", "岁": "tuổi", "本": "quyển (sách)", "些": "một số, một ít", "块": "đồng (tiền), miếng",
    "不": "không", "没": "không (có)", "很": "rất", "太": "quá, lắm", "都": "đều", "和": "và, với", "在": "ở, đang",
    "的": "của (trợ từ sở hữu)", "了": "rồi (trợ từ ngữ khí)", "吗": "không? (câu hỏi)", "呢": "nhỉ, nhé", "吧": "đi, nhé",
    "喂": "alo", "家": "nhà, gia đình", "学校": "trường học", "饭店": "nhà hàng", "商店": "cửa hàng", "医院": "bệnh viện", "火车站": "ga tàu hỏa",
    "中国": "Trung Quốc", "北京": "Bắc Kinh", "上": "trên", "下": "dưới", "前面": "phía trước", "后面": "phía sau", "里": "trong",
    "今天": "hôm nay", "明天": "ngày mai", "昨天": "hôm qua", "上午": "buổi sáng", "中午": "buổi trưa", "下午": "buổi chiều",
    "年": "năm", "月": "tháng", "日": "ngày", "星期": "thứ, tuần", "点": "giờ", "分钟": "phút", "现在": "bây giờ", "时候": "lúc, khi",
    "爸爸": "bố", "妈妈": "mẹ", "儿子": "con trai", "女儿": "con gái", "老师": "thầy cô giáo", "学生": "học sinh", "同学": "bạn học",
    "朋友": "bạn bè", "医生": "bác sĩ", "先生": "ông, ngài, chồng", "小姐": "cô, tiểu thư", "衣服": "quần áo", "水": "nước",
    "菜": "rau, món ăn", "米饭": "cơm", "水果": "hoa quả", "苹果": "táo", "茶": "trà", "杯i": "cốc, ly", "钱": "tiền", "飞机": "máy bay",
    "出租车": "xe taxi", "电视": "tivi", "电脑": "máy tính", "电影": "phim", "天气": "thời tiết", "猫": "mèo", "狗": "chó", "东西": "đồ đạc",
    "人": "người", "名字": "tên", "书": "sách", "汉语": "tiếng Hán", "字": "chữ", "桌子": "cái bàn", "椅子": "cái ghế",
    "谢谢": "cảm ơn", "不客气": "đừng khách khí", "再见": "tạm biệt", "请": "mời, xin", "对不起": "xin lỗi", "没关系": "không sao",
    "是": "là", "有": "có", "看": "nhìn, xem", "听": "nghe", "说话": "nói chuyện", "读": "đọc", "写": "viết", "看见": "nhìn thấy",
    "叫": "gọi, tên là", "来": "đến", "回": "về", "去": "đi", "吃": "ăn", "喝": "uống", "睡觉": "ngủ", "想": "muốn, nhớ", "做": "làm",
    "买": "mua", "开": "mở, lái", "坐": "ngồi", "住": "ở, trú", "学习": "học tập", "工作": "làm việc", "下雨": "mưa", "爱": "yêu",
    "喜欢": "thích", "想": "muốn, nhớ", "认识": "quen biết", "会": "biết, sẽ", "能": "có thể"
}

def translate():
    conn = get_conn()
    cursor = conn.cursor()
    print("Updating HSK 1 meanings...")
    updated = 0
    for word, vi in hsk1_vi.items():
        cursor.execute("UPDATE Vocabulary SET meaning_vi = ? WHERE word = ?", vi, word)
        updated += cursor.rowcount
    conn.commit()
    print(f"Successfully updated {updated} words.")
    conn.close()

if __name__ == "__main__":
    translate()
