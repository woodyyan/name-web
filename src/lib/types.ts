// ============================================
// 「诗名」核心类型定义
// ============================================

/** 性别偏好 */
export type Gender = "male" | "female" | "neutral";

/** 典籍分类 */
export type Collection =
  | "诗经"
  | "楚辞"
  | "唐诗"
  | "宋词"
  | "论语"
  | "道德经";

/** 意境分类 */
export type Mood = "山水田园" | "豪放壮志" | "婉约柔美" | "清雅脱俗";

/** 取名请求参数 */
export interface GenerateNamesRequest {
  surname: string;
  gender: Gender;
  collections: Collection[];
  excludeNames: string[];
  batchIndex: number;
  /** 用户指定的字（可选），名字中必须包含该字 */
  designatedChar?: string;
}

/** 诗句出处 */
export interface PoetrySource {
  text: string; // 取名所在的诗句
  fullText: string; // 完整诗段/全诗
  title: string; // 篇名
  author: string; // 作者
  dynasty: string; // 朝代
  collection: string; // 典籍分类
}

/** 取名释义 */
export interface NameInterpretation {
  nameReason: string; // 为什么选这两个字
  meaning: string; // 寓意解读
  imagery: string; // 意境描绘
}

/** 单个名字结果 */
export interface NameResult {
  id: string;
  fullName: string; // 完整姓名
  givenName: string; // 名
  pinyin: string; // 全名拼音（带声调）
  pinyinGiven: string; // 名的拼音
  tonePattern: string; // 声调模式（如 "仄平平"）
  source: PoetrySource;
  interpretation: NameInterpretation;
  verified: boolean;
}

/** 取名响应 */
export interface GenerateNamesResponse {
  names: NameResult[];
  batchIndex: number;
  hasMore: boolean;
}

/** 精选诗句数据条目 */
export interface CuratedVerse {
  id: string;
  text: string; // 诗句
  fullText: string; // 完整诗段
  title: string;
  author: string;
  dynasty: string;
  collection: Collection;
  nameChars: string[]; // 适合取名的字
  mood: Mood[];
  genderFit: Gender;
}

/** 收藏项 */
export interface FavoriteItem {
  name: NameResult;
  savedAt: number; // 时间戳
}
