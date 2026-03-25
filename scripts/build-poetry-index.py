#!/usr/bin/env python3
"""
从 chinese-poetry 开源数据库提取诗句，过滤后生成取名用的精简索引。

用法：
  python3 scripts/build-poetry-index.py

输入：chinese-poetry-master 目录（与本项目同级）
输出：src/data/poetry-index.json
"""

import json
import os
import re
import glob
import random

# ============================================
# 配置
# ============================================

POETRY_ROOT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "..", "chinese-poetry-master"
)
OUTPUT_FILE = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "src", "data", "poetry-index.json"
)

# ============================================
# 第一层：负面关键词黑名单
# ============================================

NEGATIVE_KEYWORDS = set(
    "死 亡 丧 哭 泣 悲 愁 恨 怨 别离 断肠 "
    "凄 惨 枯 衰 败 残 孤坟 泪 血 "
    "战 杀 刀 剑 兵 疾 病 苦 贫 囚 牢 "
    "鬼 魔 妖 棺 墓 葬 殇 殁 陨 堕 "
    "哀 伤 悼 泣 呜呼 呜 噫 嗟 "
    "饥 饿 寡 孤 独 奴 婢 "
    "毒 邪 祸 灾 难 厄 劫 "
    "老 暮 迟暮 萧条 萧瑟 荒凉 凋 零落 "
    "冢 尸 骨 腐 朽 臭 "
    "盗 贼 匪 寇 虏 "
    "罪 罚 刑 诛 斩 "
    "忧 闷 郁 烦 躁 "
    "堕落 沉沦 沦 陷 覆 亡国 "
    "离 别 去 逝 "
    "泥 污 浊 秽 垢 "
    "夜哭 号 嚎 啼哭 痛哭".split()
)

# 更精确的过滤：这些是两字组合才算负面（单字可能有正面用法）
NEGATIVE_BIGRAMS = set(
    "离别 别离 生死 死生 战争 战乱 荒芜 凋零 零落 "
    "萧条 萧瑟 悲伤 悲痛 哀伤 哀愁 愁苦 忧愁 忧伤 "
    "孤独 孤寂 寂寞 凄凉 凄惨 惨淡 荒凉 衰败 衰老 "
    "病重 疾病 贫穷 贫寒 饥寒 饥饿".split()
)

# 单字黑名单（这些单字出现就排除）
NEGATIVE_SINGLE = set(
    "死 亡 丧 哭 泣 棺 墓 葬 尸 骨 鬼 魔 妖 "
    "杀 斩 诛 刑 囚 牢 奴 婢 "
    "毒 邪 祸 灾 厄 "
    "臭 腐 朽 秽 垢 污 浊 "
    "盗 贼 匪 寇 虏".split()
)

# ============================================
# 第二层：正面意象关键词（加分）
# ============================================

POSITIVE_KEYWORDS = set(
    "花 月 春 风 云 山 水 玉 金 兰 竹 梅 松 柏 "
    "清 明 雅 华 辉 瑞 和 安 宁 泰 嘉 善 美 "
    "文 武 志 德 贤 慧 秀 英 才 杰 豪 俊 "
    "芳 馨 香 馥 芝 蕙 荷 莲 桂 菊 "
    "星 辰 日 光 霞 虹 彩 "
    "鹤 凤 鸾 鸿 燕 莺 鹊 "
    "琴 瑟 笙 箫 歌 舞 "
    "锦 绣 珠 翠 璧 琼 瑶 "
    "仁 义 礼 智 信 忠 孝 廉 "
    "博 渊 浩 广 远 高 深 "
    "静 恬 淡 逸 闲 舒 "
    "新 初 朝 晨 曙 "
    "翠 碧 青 丹 紫 "
    "鹿 麟 龙 "
    "天 地 河 海 江 湖 溪 泉 "
    "田 园 林 森 峰 岭 "
    "飞 翔 腾 跃 "
    "乐 喜 欢 悦 笑 "
    "思 怀 念 望 梦".split()
)

# ============================================
# 工具函数
# ============================================

def clean_sentence(s: str) -> str:
    """清理诗句：去除标点、空格"""
    s = s.strip()
    # 去除常见标点
    s = re.sub(r'[，。！？、；：""''（）《》【】\s\u3000]', '', s)
    return s

def has_negative(sentence: str) -> bool:
    """检查诗句是否含负面内容"""
    for word in NEGATIVE_SINGLE:
        if word in sentence:
            return True
    for bigram in NEGATIVE_BIGRAMS:
        if bigram in sentence:
            return True
    return False

def positive_score(sentence: str) -> int:
    """计算正面意象得分"""
    score = 0
    for word in POSITIVE_KEYWORDS:
        if word in sentence:
            score += 1
    return score

def is_valid_sentence(sentence: str) -> bool:
    """检查诗句是否适合取名"""
    cleaned = clean_sentence(sentence)
    # 太短（少于4个字）或太长（超过20个字）
    if len(cleaned) < 4 or len(cleaned) > 20:
        return False
    # 含负面内容
    if has_negative(cleaned):
        return False
    # 全是数字或非中文
    if not re.search(r'[\u4e00-\u9fff]{4,}', cleaned):
        return False
    return True

def split_into_sentences(content_line: str) -> list:
    """将一行诗拆成多个子句"""
    # 按常见分隔符拆分
    parts = re.split(r'[，。！？；：、\s]+', content_line)
    return [p.strip() for p in parts if p.strip()]

# ============================================
# 各典籍数据提取
# ============================================

def extract_shijing(poetry_root: str) -> list:
    """提取诗经"""
    filepath = os.path.join(poetry_root, "诗经", "shijing.json")
    if not os.path.exists(filepath):
        print(f"  跳过：{filepath} 不存在")
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    results = []
    for poem in data:
        title = poem.get("title", "")
        section = poem.get("section", "")
        chapter = poem.get("chapter", "")
        author = "佚名"
        dynasty = "先秦"
        collection = "诗经"
        
        for line in poem.get("content", []):
            # 每行可能含多个子句，如 "关关雎鸠，在河之洲。窈窕淑女，君子好逑。"
            # 我们既保留整行，也拆分子句对
            sentences = split_into_sentences(line)
            
            # 两两组合作为一个取名诗句（如"关关雎鸠，在河之洲"）
            for i in range(0, len(sentences) - 1, 2):
                pair = sentences[i] + "，" + sentences[i + 1]
                if is_valid_sentence(pair):
                    results.append({
                        "s": pair,  # sentence
                        "t": title,  # title
                        "a": author,
                        "d": dynasty,
                        "c": collection,
                        "p": positive_score(pair),  # positive score
                    })
            
            # 单句也收录（如果足够长）
            for sent in sentences:
                if len(clean_sentence(sent)) >= 4 and is_valid_sentence(sent):
                    results.append({
                        "s": sent,
                        "t": title,
                        "a": author,
                        "d": dynasty,
                        "c": collection,
                        "p": positive_score(sent),
                    })
    
    return results

def extract_chuci(poetry_root: str) -> list:
    """提取楚辞"""
    filepath = os.path.join(poetry_root, "楚辞", "chuci.json")
    if not os.path.exists(filepath):
        print(f"  跳过：{filepath} 不存在")
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    results = []
    for poem in data:
        title = poem.get("title", "")
        author = poem.get("author", "屈原")
        dynasty = "先秦"
        collection = "楚辞"
        
        for line in poem.get("content", []):
            # 楚辞以"兮"分句
            parts = re.split(r'[，。！？；：、兮\s]+', line)
            parts = [p.strip() for p in parts if p.strip() and len(p.strip()) >= 2]
            
            # 两两组合
            for i in range(0, len(parts) - 1, 2):
                pair = parts[i] + "兮，" + parts[i + 1]
                if is_valid_sentence(pair):
                    results.append({
                        "s": pair,
                        "t": title,
                        "a": author,
                        "d": dynasty,
                        "c": collection,
                        "p": positive_score(pair),
                    })
            
            # 也保留原始行（去掉过长的）
            cleaned_line = line.strip().rstrip("。，！？")
            if 4 <= len(clean_sentence(cleaned_line)) <= 20 and is_valid_sentence(cleaned_line):
                results.append({
                    "s": cleaned_line,
                    "t": title,
                    "a": author,
                    "d": dynasty,
                    "c": collection,
                    "p": positive_score(cleaned_line),
                })
    
    return results

def extract_tangshi(poetry_root: str) -> list:
    """提取全唐诗"""
    pattern = os.path.join(poetry_root, "全唐诗", "poet.tang.*.json")
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"  跳过：未找到唐诗文件")
        return []
    
    results = []
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for poem in data:
            author = poem.get("author", "佚名")
            title = poem.get("title", "")
            dynasty = "唐"
            collection = "唐诗"
            
            for line in poem.get("paragraphs", []):
                sentences = split_into_sentences(line)
                
                # 两两组合
                for i in range(0, len(sentences) - 1, 2):
                    pair = sentences[i] + "，" + sentences[i + 1]
                    if is_valid_sentence(pair):
                        results.append({
                            "s": pair,
                            "t": title,
                            "a": author,
                            "d": dynasty,
                            "c": collection,
                            "p": positive_score(pair),
                        })
    
    return results

def extract_songci(poetry_root: str) -> list:
    """提取宋词"""
    pattern = os.path.join(poetry_root, "宋词", "ci.song.*.json")
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"  跳过：未找到宋词文件")
        return []
    
    results = []
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for poem in data:
            author = poem.get("author", "佚名")
            title = poem.get("rhythmic", "")  # 宋词用 rhythmic 作词牌名
            dynasty = "宋"
            collection = "宋词"
            
            for line in poem.get("paragraphs", []):
                sentences = split_into_sentences(line)
                
                for i in range(0, len(sentences) - 1, 2):
                    pair = sentences[i] + "，" + sentences[i + 1]
                    if is_valid_sentence(pair):
                        results.append({
                            "s": pair,
                            "t": title,
                            "a": author,
                            "d": dynasty,
                            "c": collection,
                            "p": positive_score(pair),
                        })
                
                # 单句（词的句式灵活，单句也有好的）
                for sent in sentences:
                    if len(clean_sentence(sent)) >= 5 and is_valid_sentence(sent):
                        results.append({
                            "s": sent,
                            "t": title,
                            "a": author,
                            "d": dynasty,
                            "c": collection,
                            "p": positive_score(sent),
                        })
    
    return results

def extract_songshi(poetry_root: str) -> list:
    """提取宋诗"""
    pattern = os.path.join(poetry_root, "全唐诗", "poet.song.*.json")
    files = sorted(glob.glob(pattern))
    if not files:
        print(f"  跳过：未找到宋诗文件")
        return []
    
    results = []
    for filepath in files:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        for poem in data:
            author = poem.get("author", "佚名")
            title = poem.get("title", "")
            dynasty = "宋"
            collection = "宋诗"
            
            for line in poem.get("paragraphs", []):
                sentences = split_into_sentences(line)
                
                for i in range(0, len(sentences) - 1, 2):
                    pair = sentences[i] + "，" + sentences[i + 1]
                    if is_valid_sentence(pair):
                        results.append({
                            "s": pair,
                            "t": title,
                            "a": author,
                            "d": dynasty,
                            "c": collection,
                            "p": positive_score(pair),
                        })
    
    return results

def extract_yuanqu(poetry_root: str) -> list:
    """提取元曲"""
    filepath = os.path.join(poetry_root, "元曲", "yuanqu.json")
    if not os.path.exists(filepath):
        print(f"  跳过：{filepath} 不存在")
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    results = []
    for poem in data:
        author = poem.get("author", "佚名")
        title = poem.get("title", "")
        dynasty = "元"
        collection = "元曲"
        
        for line in poem.get("paragraphs", poem.get("content", [])):
            sentences = split_into_sentences(line)
            
            for i in range(0, len(sentences) - 1, 2):
                pair = sentences[i] + "，" + sentences[i + 1]
                if is_valid_sentence(pair):
                    results.append({
                        "s": pair,
                        "t": title,
                        "a": author,
                        "d": dynasty,
                        "c": collection,
                        "p": positive_score(pair),
                    })
    
    return results

def extract_lunyu(poetry_root: str) -> list:
    """提取论语"""
    filepath = os.path.join(poetry_root, "论语", "lunyu.json")
    if not os.path.exists(filepath):
        print(f"  跳过：{filepath} 不存在")
        return []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    results = []
    for chapter in data:
        title = chapter.get("chapter", "")
        author = "孔子"
        dynasty = "先秦"
        collection = "论语"
        
        for para in chapter.get("paragraphs", []):
            sentences = split_into_sentences(para)
            
            for sent in sentences:
                if len(clean_sentence(sent)) >= 4 and is_valid_sentence(sent):
                    results.append({
                        "s": sent,
                        "t": title,
                        "a": author,
                        "d": dynasty,
                        "c": collection,
                        "p": positive_score(sent),
                    })
    
    return results

def extract_sishu(poetry_root: str) -> list:
    """提取四书五经（大学、中庸、孟子）"""
    results = []
    
    mapping = {
        "daxue.json": ("大学", "曾子", "大学"),
        "zhongyong.json": ("中庸", "子思", "中庸"),
        "mengzi.json": ("孟子", "孟子", "孟子"),
    }
    
    for filename, (title_prefix, author, collection) in mapping.items():
        filepath = os.path.join(poetry_root, "四书五经", filename)
        if not os.path.exists(filepath):
            continue
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 大学/中庸是单个 dict，孟子是 list
        if isinstance(data, dict):
            chapters = [data]
        else:
            chapters = data
        
        for chapter in chapters:
            title = chapter.get("chapter", title_prefix)
            
            for para in chapter.get("paragraphs", []):
                sentences = split_into_sentences(para)
                
                for sent in sentences:
                    if len(clean_sentence(sent)) >= 4 and is_valid_sentence(sent):
                        results.append({
                            "s": sent,
                            "t": title,
                            "a": author,
                            "d": "先秦",
                            "c": collection,
                            "p": positive_score(sent),
                        })
    
    return results

# ============================================
# 去重 + 质量排序
# ============================================

def deduplicate(results: list) -> list:
    """按诗句内容去重"""
    seen = set()
    unique = []
    for item in results:
        key = clean_sentence(item["s"])
        if key not in seen:
            seen.add(key)
            unique.append(item)
    return unique

# ============================================
# 主流程
# ============================================

def main():
    poetry_root = os.path.abspath(POETRY_ROOT)
    print(f"诗词数据目录: {poetry_root}")
    
    if not os.path.exists(poetry_root):
        print(f"错误：目录不存在 {poetry_root}")
        return
    
    all_results = []
    
    # 提取各典籍
    extractors = [
        ("诗经", extract_shijing),
        ("楚辞", extract_chuci),
        ("唐诗", extract_tangshi),
        ("宋词", extract_songci),
        ("宋诗", extract_songshi),
        ("元曲", extract_yuanqu),
        ("论语", extract_lunyu),
        ("四书五经", extract_sishu),
    ]
    
    for name, extractor in extractors:
        print(f"\n提取 {name}...")
        results = extractor(poetry_root)
        print(f"  原始提取: {len(results)} 条")
        all_results.extend(results)
    
    print(f"\n合计原始提取: {len(all_results)} 条")
    
    # 去重
    all_results = deduplicate(all_results)
    print(f"去重后: {len(all_results)} 条")
    
    # 按正面得分排序（高分在前），同分随机
    random.seed(42)
    random.shuffle(all_results)
    all_results.sort(key=lambda x: x["p"], reverse=True)
    
    # 统计各典籍分布（精简前）
    collection_stats = {}
    for item in all_results:
        c = item["c"]
        collection_stats[c] = collection_stats.get(c, 0) + 1
    
    print(f"\n各典籍分布（精简前）:")
    for c, count in sorted(collection_stats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {count} 条")
    
    # 正面得分分布
    score_dist = {}
    for item in all_results:
        s = item["p"]
        score_dist[s] = score_dist.get(s, 0) + 1
    print(f"\n正面得分分布:")
    for s in sorted(score_dist.keys(), reverse=True)[:10]:
        print(f"  得分 {s}: {score_dist[s]} 条")
    
    # ============================================
    # 精简策略：
    # 1. 只保留正面得分 >= 2 的诗句（至少含2个正面意象词）
    # 2. 得分=1 的按比例抽样（保留20%）
    # 3. 小典籍（诗经/楚辞/论语等）全量保留（本身量不大且经典）
    # 4. 大典籍（唐诗/宋诗/宋词）按上限控制
    # ============================================
    
    SMALL_COLLECTIONS = {"诗经", "楚辞", "论语", "大学", "中庸", "孟子"}
    MAX_PER_LARGE_COLLECTION = 5000  # 大典籍每个最多保留条数
    
    # 先按典籍分组
    by_collection = {}
    for item in all_results:
        c = item["c"]
        if c not in by_collection:
            by_collection[c] = []
        by_collection[c].append(item)
    
    selected = []
    for c, items in by_collection.items():
        if c in SMALL_COLLECTIONS:
            # 小典籍：保留得分 >= 1 的全部
            kept = [x for x in items if x["p"] >= 1]
            selected.extend(kept)
            print(f"\n  {c}: 全量保留 {len(kept)} 条（得分>=1）")
        else:
            # 大典籍：优先高分，控制总量
            # 得分 >= 2 全部保留
            high = [x for x in items if x["p"] >= 2]
            if len(high) >= MAX_PER_LARGE_COLLECTION:
                # 高分就够了，截断
                kept = high[:MAX_PER_LARGE_COLLECTION]
            else:
                # 高分不够，补充得分=1 的
                low = [x for x in items if x["p"] == 1]
                remaining = MAX_PER_LARGE_COLLECTION - len(high)
                random.shuffle(low)
                kept = high + low[:remaining]
            selected.extend(kept)
            print(f"  {c}: 保留 {len(kept)} 条（高分 {len(high)}, 上限 {MAX_PER_LARGE_COLLECTION}）")
    
    # 最终重新按得分排序
    random.shuffle(selected)
    selected.sort(key=lambda x: x["p"], reverse=True)
    
    print(f"\n精简后总计: {len(selected)} 条")
    
    # 统计精简后分布
    final_stats = {}
    for item in selected:
        c = item["c"]
        final_stats[c] = final_stats.get(c, 0) + 1
    print(f"\n各典籍分布（精简后）:")
    for c, count in sorted(final_stats.items(), key=lambda x: -x[1]):
        print(f"  {c}: {count} 条")
    
    # 输出（去掉 p 分数字段，生产环境不需要）
    output = []
    for item in selected:
        output.append({
            "s": item["s"],
            "t": item["t"],
            "a": item["a"],
            "d": item["d"],
            "c": item["c"],
        })
    
    # 确保输出目录存在
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, separators=(',', ':'))
    
    file_size = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    print(f"\n✅ 输出: {OUTPUT_FILE}")
    print(f"   总条数: {len(output)}")
    print(f"   文件大小: {file_size:.2f} MB")

if __name__ == "__main__":
    main()
