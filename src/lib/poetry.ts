import type { CuratedVerse, Collection, Gender, Mood } from "./types";
import versesData from "@/data/curated-verses.json";

const verses: CuratedVerse[] = versesData as CuratedVerse[];

export interface FilterOptions {
  collections?: Collection[];
  gender?: Gender;
  mood?: Mood[];
  excludeIds?: string[];
}

/**
 * 根据筛选条件获取候选诗句
 */
export function filterVerses(options: FilterOptions): CuratedVerse[] {
  let filtered = [...verses];

  // 按典籍筛选
  if (options.collections && options.collections.length > 0) {
    filtered = filtered.filter((v) =>
      options.collections!.includes(v.collection)
    );
  }

  // 按性别偏好筛选
  if (options.gender && options.gender !== "neutral") {
    filtered = filtered.filter(
      (v) => v.genderFit === options.gender || v.genderFit === "neutral"
    );
  }

  // 按意境筛选
  if (options.mood && options.mood.length > 0) {
    filtered = filtered.filter((v) =>
      v.mood.some((m) => options.mood!.includes(m))
    );
  }

  // 排除已用过的
  if (options.excludeIds && options.excludeIds.length > 0) {
    filtered = filtered.filter((v) => !options.excludeIds!.includes(v.id));
  }

  return filtered;
}

/**
 * 随机打乱数组
 */
export function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * 获取一批候选诗句（用于发给 AI）
 */
export function getCandidateVerses(
  options: FilterOptions,
  count: number = 12
): CuratedVerse[] {
  const filtered = filterVerses(options);
  const shuffled = shuffleArray(filtered);
  return shuffled.slice(0, count);
}

/**
 * 搜索包含指定字的诗句
 * 先按 text（取名诗句）搜索，不够再搜 fullText（完整诗段）
 */
export function searchVersesByChar(
  char: string,
  options?: FilterOptions
): CuratedVerse[] {
  let pool = options ? filterVerses(options) : [...verses];

  // 优先搜 text 字段（取名诗句更精准）
  let matched = pool.filter((v) => v.text.includes(char));

  // 如果太少（<3），放宽到 fullText 搜索
  if (matched.length < 3) {
    const fullTextMatched = pool.filter(
      (v) => !v.text.includes(char) && v.fullText.includes(char)
    );
    matched = [...matched, ...fullTextMatched];
  }

  // 如果仍然太少（<3），去掉筛选条件再搜一次
  if (matched.length < 3 && options) {
    const allMatched = verses.filter((v) =>
      v.text.includes(char) || v.fullText.includes(char)
    );
    // 去重：排除已有的
    const existingIds = new Set(matched.map((v) => v.id));
    const additional = allMatched.filter((v) => !existingIds.has(v.id));
    matched = [...matched, ...additional];
  }

  return matched;
}

/**
 * 通过文本搜索验证出处
 */
export function verifySource(
  text: string,
  author: string
): CuratedVerse | null {
  return (
    verses.find(
      (v) =>
        v.fullText.includes(text) ||
        (v.text.includes(text) && v.author === author)
    ) || null
  );
}
