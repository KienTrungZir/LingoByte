import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))
from backend.app.database import SQLALCHEMY_DATABASE_URL
from backend.app import models

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def reset_and_seed():
    db = SessionLocal()
    try:
        db.query(models.LessonItem).delete()
        db.query(models.Topic).delete()
        db.commit()
        
        topics_data = [
            {"title": "Chào hỏi", "description": "Xin chào, cảm ơn, xin lỗi...", "icon_url": "👋", "hsk_level": 1},
            {"title": "Số đếm", "description": "Số từ 1 đến 100 và cách dùng", "icon_url": "🔢", "hsk_level": 1},
            {"title": "Gia đình", "description": "Bố mẹ, anh chị em, họ hàng", "icon_url": "👪", "hsk_level": 1},
            {"title": "Ẩm thực", "description": "Món ăn, đồ uống, nhà hàng", "icon_url": "🍜", "hsk_level": 1},
            {"title": "Thời gian", "description": "Ngày tháng, giờ giấc, tuần tháng", "icon_url": "⏰", "hsk_level": 2},
            {"title": "Du lịch", "description": "Phương tiện, địa điểm, hỏi đường", "icon_url": "✈️", "hsk_level": 2},
            {"title": "Mua sắm", "description": "Giá cả, màu sắc, kích thước", "icon_url": "🛍️", "hsk_level": 2},
            {"title": "Cơ thể & Sức khỏe", "description": "Bộ phận cơ thể, bệnh tật", "icon_url": "🏃", "hsk_level": 2},
            {"title": "Công việc", "description": "Nghề nghiệp, văn phòng, công ty", "icon_url": "💼", "hsk_level": 3},
            {"title": "Thời tiết", "description": "Mô tả thời tiết, mùa trong năm", "icon_url": "☀️", "hsk_level": 2},
            {"title": "Cảm xúc & Tính cách", "description": "Vui buồn, tính cách con người", "icon_url": "😊", "hsk_level": 3},
            {"title": "Học tập", "description": "Trường học, môn học, thi cử", "icon_url": "📚", "hsk_level": 3},
        ]

        for t_data in topics_data:
            topic = models.Topic(**t_data)
            db.add(topic)
        
        db.commit()
        print("Topics seeded correctly.")

        # Re-fetch topic IDs
        def get_id(title):
            topic = db.query(models.Topic).filter(models.Topic.title == title).first()
            return topic.topic_id if topic else None

        chao_hoi_id = get_id("Chào hỏi")
        so_dem_id = get_id("Số đếm")
        gia_dinh_id = get_id("Gia đình")
        am_thuc_id = get_id("Ẩm thực")
        thoi_gian_id = get_id("Thời gian")
        du_lich_id = get_id("Du lịch")
        mua_sam_id = get_id("Mua sắm")
        suc_khoe_id = get_id("Cơ thể & Sức khỏe")
        cong_viec_id = get_id("Công việc")
        thoi_tiet_id = get_id("Thời tiết")
        cam_xuc_id = get_id("Cảm xúc & Tính cách")
        hoc_tap_id = get_id("Học tập")

        # Seed Lesson Items
        def link_word(topic_id, word):
            if not topic_id: return
            vocab = db.query(models.Vocabulary).filter(models.Vocabulary.word == word).first()
            if vocab:
                # Avoid duplicates
                exists = db.query(models.LessonItem).filter(models.LessonItem.topic_id == topic_id, models.LessonItem.vocab_id == vocab.vocab_id).first()
                if not exists:
                    db.add(models.LessonItem(topic_id=topic_id, vocab_id=vocab.vocab_id))
            else:
                char = db.query(models.Character).filter(models.Character.hanzi == word).first()
                if char:
                    exists = db.query(models.LessonItem).filter(models.LessonItem.topic_id == topic_id, models.LessonItem.char_id == char.char_id).first()
                    if not exists:
                        db.add(models.LessonItem(topic_id=topic_id, char_id=char.char_id))

        # Chào hỏi
        for w in ["你好", "谢谢", "对不起", "再见", "您好", "没关系", "不客气", "请问", "名字", "认识"]:
            link_word(chao_hoi_id, w)
        
        # Số đếm
        for w in ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "百", "零", "两"]:
            link_word(so_dem_id, w)

        # Gia đình
        for w in ["爸爸", "妈妈", "哥哥", "姐姐", "弟弟", "妹妹", "爷爷", "奶奶", "孩子", "家"]:
            link_word(gia_dinh_id, w)

        # Ẩm thực
        for w in ["吃", "喝", "米饭", "面条", "水", "茶", "咖啡", "饭店", "水果", "苹果", "菜"]:
            link_word(am_thuc_id, w)

        # Thời gian
        for w in ["现在", "点", "分钟", "今天", "明天", "昨天", "星期", "月", "年", "时候", "上午", "下午"]:
            link_word(thoi_gian_id, w)

        # Du lịch
        for w in ["去", "想", "买", "票", "火车站", "飞机场", "出租车", "坐", "开车", "旅游"]:
            link_word(du_lich_id, w)

        # Mua sắm
        for w in ["多少", "钱", "块", "贵", "便宜", "衣服", "商店", "东西", "本"]:
            link_word(mua_sam_id, w)

        # Cơ thể & Sức khỏe
        for w in ["医生", "医院", "身体", "舒服", "感冒", "头", "眼睛", "手", "脚"]:
            link_word(suc_khoe_id, w)

        # Công việc
        for w in ["工作", "老师", "学生", "公司", "医生", "经理", "办公室", "上班"]:
            link_word(cong_viec_id, w)

        # Thời tiết
        for w in ["冷", "热", "下雨", "下雪", "晴天", "天气", "刮风", "阴天"]:
            link_word(thoi_tiet_id, w)

        # Cảm xúc & Tính cách
        for w in ["高兴", "漂亮", "聪明", "累", "忙", "开心", "生气", "难过"]:
            link_word(cam_xuc_id, w)

        # Học tập
        for w in ["学习", "汉语", "书", "笔", "考试", "学校", "同学", "教室", "听", "说", "读", "写"]:
            link_word(hoc_tap_id, w)

        db.commit()
        print("Lesson items expanded and seeded correctly.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed()
