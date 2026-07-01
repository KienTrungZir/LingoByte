# -*- coding: utf-8 -*-
"""Seed example_sentence data for Vocabulary items used in Topics."""

from sqlalchemy import create_engine, text

engine = create_engine('mssql+pyodbc://@localhost/HanziEcosystem?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes')

# Map vocab_id -> example_sentence (containing the word itself)
sentences = {
    # === Topic 51: Chào hỏi ===
    43:  "喂，你好！",                          # 喂 wèi
    106: "谢谢你的帮助。",                      # 谢谢 xiè xiè
    661: "见面要打招呼。",                      # 打招呼

    # === Topic 52: Số đếm ===
    16:  "我有一个苹果。",                      # 一 yī
    17:  "他有二十块钱。",                      # 二 èr
    18:  "我买了三本书。",                      # 三 sān
    19:  "四个人一起吃饭。",                    # 四 sì
    20:  "今天星期五。",                        # 五 wǔ
    21:  "他六岁了。",                          # 六 liù
    22:  "一个星期有七天。",                    # 七 qī
    23:  "我家有八口人。",                      # 八 bā
    24:  "九月是秋天。",                        # 九 jiǔ
    25:  "他考了十分。",                        # 十 shí
    156: "今天零下五度。",                      # 零 líng
    157: "我有两个孩子。",                      # 两 liǎng
    158: "这本书一百块。",                      # 百 bǎi

    # === Topic 53: Gia đình ===
    44:  "我很爱我的家。",                      # 家 jiā
    70:  "爸爸在看电视。",                      # 爸爸 bà ba
    71:  "妈妈做饭很好吃。",                    # 妈妈 mā ma
    198: "哥哥比我大三岁。",                    # 哥哥 gē ge
    199: "姐姐在北京工作。",                    # 姐姐 jiě jie
    200: "弟弟今年上小学。",                    # 弟弟 dì di
    201: "妹妹喜欢画画。",                      # 妹妹 mèi mei
    204: "孩子们在公园玩。",                    # 孩子 hái zi
    464: "奶奶给我做饭。",                      # 奶奶 nǎi nai
    550: "爷爷今年八十岁。",                    # 爷爷 yé ye

    # === Topic 54: Ẩm thực ===
    46:  "我们去饭店吃饭吧。",                  # 饭店 fàn diàn
    82:  "请给我一杯水。",                      # 水 shuǐ
    83:  "这个菜很好吃。",                      # 菜 cài
    84:  "我想吃米饭。",                        # 米饭 mǐ fàn
    85:  "多吃水果对身体好。",                  # 水果 shuǐ guǒ
    86:  "苹果是红色的。",                      # 苹果 píng guǒ
    87:  "中国人喜欢喝茶。",                    # 茶 chá
    124: "你想吃什么？",                        # 吃 chī
    125: "他每天喝咖啡。",                      # 喝 hē
    213: "早上我喝了一杯咖啡。",                # 咖啡 kā fēi
    233: "我最喜欢吃面条。",                    # 面条 miàn tiáo

    # === Topic 55: Thời gian ===
    56:  "今天天气很好。",                      # 今天 jīn tiān
    57:  "明天我们去旅游。",                    # 明天 míng tiān
    58:  "昨天下了很大的雨。",                  # 昨天 zuó tiān
    59:  "上午我有课。",                        # 上午 shàng wǔ
    61:  "下午我去打球。",                      # 下午 xià wǔ
    62:  "新年快乐！",                          # 年 nián
    63:  "这个月有三十天。",                    # 月 yuè
    65:  "这个星期你忙吗？",                    # 星期 xīng qī
    66:  "现在几点了？",                        # 点 diǎn
    67:  "等我五分钟。",                        # 分钟 fēn zhōng
    68:  "现在是下午三点。",                    # 现在 xiàn zài
    69:  "什么时候去中国？",                    # 时候 shí hòu

    # === Topic 56: Du lịch ===
    91:  "我们坐出租车去吧。",                  # 出租车 chū zū chē
    123: "我想去中国旅游。",                    # 去 qù
    129: "我要买一张票。",                      # 买 mǎi
    131: "请坐这里。",                          # 坐 zuò
    138: "我想去北京看长城。",                  # 想 xiǎng
    229: "请给我两张票。",                      # 票 piào
    234: "火车站在哪里？",                      # 火车站 huǒ chē zhàn
    263: "旅游可以开阔眼界。",                  # 旅游 lǚ yóu

    # === Topic 57: Mua sắm ===
    12:  "这个多少钱？",                        # 多少 duō shao
    28:  "我买了三本书。",                      # 本 běn
    30:  "苹果五块钱一斤。",                    # 块 kuài
    47:  "我去商店买东西。",                    # 商店 shāng diàn
    81:  "她买了新衣服。",                      # 衣服 yī fú
    89:  "你有多少钱？",                        # 钱 qián
    98:  "你要买什么东西？",                    # 东西 dōng xi
    291: "这个东西太贵了。",                    # 贵 guì
    292: "这件衣服很便宜。",                    # 便宜 pián yi

    # === Topic 58: Cơ thể & Sức khỏe ===
    48:  "他去医院看病了。",                    # 医院 yī yuàn
    78:  "医生说要多休息。",                    # 医生 yī shēng
    218: "她的眼睛很漂亮。",                    # 眼睛 yǎn jing
    219: "运动对身体好。",                      # 身体 shēn tǐ
    371: "我感冒了，头很疼。",                  # 感冒 gǎn mào
    417: "我的脚很疼。",                        # 脚 jiǎo
    501: "今天身体不舒服。",                    # 舒服 shū fú

    # === Topic 59: Công việc ===
    74:  "老师教我们汉语。",                    # 老师 lǎo shī
    75:  "我是大学学生。",                      # 学生 xué shēng
    134: "他在银行工作。",                      # 工作 gōng zuò
    235: "她在一家公司上班。",                  # 公司 gōng sī
    264: "爸爸每天上班很忙。",                  # 上班 shàng bān
    309: "办公室在二楼。",                      # 办公室 bàn gōng shì
    428: "经理今天不在。",                      # 经理 jīng lǐ

    # === Topic 60: Thời tiết ===
    95:  "今天天气怎么样？",                    # 天气 tiān qì
    135: "明天可能会下雨。",                    # 下雨 xià yǔ
    147: "冬天很冷。",                          # 冷 lěng
    148: "夏天很热。",                          # 热 rè
    380: "外面刮风了。",                        # 刮风 guā fēng

    # === Topic 61: Cảm xúc & Tính cách ===
    149: "他考试考得很好，很高兴。",            # 高兴 gāo xìng
    150: "这朵花很漂亮。",                      # 漂亮 piào liàng
    282: "最近工作太忙了。",                    # 忙 máng
    288: "今天上了一天课，好累。",              # 累 lèi
    337: "他是一个聪明的学生。",                # 聪明 cōng míng
    467: "听到这个消息我很难过。",              # 难过 nán guò
    496: "不要生气了。",                        # 生气 shēng qì
    843: "见到朋友我很开心。",                  # 开心 kāi xīn

    # === Topic 62: Học tập ===
    45:  "我们学校很大。",                      # 学校 xué xiào
    76:  "同学们好！",                          # 同学 tóng xué
    101: "这本书很有意思。",                    # 书 shū
    102: "我在学汉语。",                        # 汉语 hàn yǔ
    115: "请听老师说。",                        # 听 tīng
    116: "你会说中文吗？",                      # 说 shuō
    117: "我每天读课文。",                      # 读 dú
    118: "他在写作业。",                        # 写 xiě
    133: "我们要好好学习。",                    # 学习 xué xí
    183: "教室里有很多学生。",                  # 教室 jiào shì
    228: "下个星期有考试。",                    # 考试 kǎo shì
}

with engine.connect() as conn:
    updated = 0
    for vocab_id, sentence in sentences.items():
        result = conn.execute(
            text("UPDATE Vocabulary SET example_sentence = :sent WHERE vocab_id = :vid"),
            {"sent": sentence, "vid": vocab_id}
        )
        if result.rowcount > 0:
            updated += 1
    conn.commit()
    print(f"Updated {updated} vocabulary items with example sentences!")
