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
