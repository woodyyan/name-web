import { pinyin } from "pinyin-pro";

/**
 * 获取带声调的拼音
 */
export function getPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", type: "string" });
}

/**
 * 获取拼音数组
 */
export function getPinyinArray(text: string): string[] {
  return pinyin(text, { toneType: "symbol", type: "array" });
}

/**
 * 获取声调模式（平仄）
 * 一声、二声为平，三声、四声为仄
 */
export function getTonePattern(text: string): string {
  const tones = pinyin(text, { toneType: "num", type: "array" });
  return tones
    .map((p) => {
      const toneNum = p.match(/\d/)?.[0];
      if (!toneNum) return "平";
      const num = parseInt(toneNum);
      return num <= 2 ? "平" : "仄";
    })
    .join("");
}

/**
 * 获取格式化的拼音展示（每个字对齐）
 */
export function getFormattedPinyin(text: string): string {
  return pinyin(text, { toneType: "symbol", type: "array" }).join(" ");
}
