/**
 * 诗词抽样器：从预处理的诗词索引中随机抽取诗句
 * 用于给 AI 提供取名素材，避免 AI 凭空编造诗词
 */

import fs from "fs";
import path from "path";

/** 诗句索引条目（与 poetry-index.json 结构一致） */
export interface PoetryEntry {
  s: string; // sentence 诗句
  t: string; // title 篇名
  a: string; // author 作者
  d: string; // dynasty 朝代
  c: string; // collection 典籍分类
}

/** 典籍名称到索引文件中 collection 字段的映射 */
const COLLECTION_MAP: Record<string, string[]> = {
  诗经: ["诗经"],
  楚辞: ["楚辞"],
  唐诗: ["唐诗"],
  宋词: ["宋词"],
  宋诗: ["宋诗"],
  元曲: ["元曲"],
  论语: ["论语"],
  大学: ["大学"],
  中庸: ["中庸"],
  孟子: ["孟子"],
  // 用户界面可能选的大类
  四书五经: ["论语", "大学", "中庸", "孟子"],
};

// ============================================
// 数据加载（懒加载 + 缓存）
// ============================================

let poetryData: PoetryEntry[] | null = null;
let poetryByCollection: Map<string, PoetryEntry[]> | null = null;

function loadPoetryData(): PoetryEntry[] {
  if (poetryData) return poetryData;

  const dataPath = path.join(process.cwd(), "src/data/poetry-index.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  poetryData = JSON.parse(raw) as PoetryEntry[];

  // 按典籍分组建索引
  poetryByCollection = new Map();
  for (const entry of poetryData) {
    const list = poetryByCollection.get(entry.c) || [];
    list.push(entry);
    poetryByCollection.set(entry.c, list);
  }

  console.log(
    `[poetry-sampler] 加载诗词索引: ${poetryData.length} 条, ${poetryByCollection.size} 个典籍`
  );

  return poetryData;
}

function getByCollection(): Map<string, PoetryEntry[]> {
  loadPoetryData();
  return poetryByCollection!;
}

// ============================================
// 抽样函数
// ============================================

/**
 * Fisher-Yates 洗牌取前 n 个（比 sort(random) 更高效）
 */
function sampleArray<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return [...arr];

  // 复制索引数组，避免修改原数组
  const indices = Array.from({ length: arr.length }, (_, i) => i);
  const result: T[] = [];

  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (indices.length - i));
    [indices[i], indices[j]] = [indices[j], indices[i]];
    result.push(arr[indices[i]]);
  }

  return result;
}

/**
 * 从诗词索引中随机抽取诗句
 *
 * @param count 抽取数量（默认 25）
 * @param collections 用户选择的典籍（空数组=全部）
 * @param excludeSentences 排除已使用的诗句（用于换一批去重）
 * @returns 抽样到的诗句列表
 */
export function samplePoetry(
  count: number = 25,
  collections: string[] = [],
  excludeSentences: string[] = []
): PoetryEntry[] {
  const byCollection = getByCollection();
  const excludeSet = new Set(excludeSentences);

  // 确定候选池
  let candidates: PoetryEntry[];

  if (collections.length === 0) {
    // 全部典籍
    candidates = loadPoetryData();
  } else {
    // 按用户选择的典籍过滤
    candidates = [];
    const seenCollections = new Set<string>();

    for (const userCollection of collections) {
      const mapped = COLLECTION_MAP[userCollection] || [userCollection];
      for (const c of mapped) {
        if (seenCollections.has(c)) continue;
        seenCollections.add(c);
        const list = byCollection.get(c);
        if (list) {
          candidates.push(...list);
        }
      }
    }
  }

  // 排除已用过的
  if (excludeSet.size > 0) {
    candidates = candidates.filter((entry) => !excludeSet.has(entry.s));
  }

  if (candidates.length === 0) {
    console.warn("[poetry-sampler] 候选池为空，返回全量随机");
    candidates = loadPoetryData();
  }

  // 随机抽样
  return sampleArray(candidates, count);
}

/**
 * 将抽样的诗句格式化为 prompt 文本
 */
export function formatPoetryForPrompt(entries: PoetryEntry[]): string {
  return entries
    .map(
      (e, i) =>
        `${i + 1}. "${e.s}" ——${e.a}《${e.t}》（${e.d}·${e.c}）`
    )
    .join("\n");
}
