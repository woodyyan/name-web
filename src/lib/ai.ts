import type {
  NameResult,
  GenerateNamesRequest,
  CuratedVerse,
} from "./types";
import { getCandidateVerses, searchVersesByChar, shuffleArray } from "./poetry";
import { getPinyin, getTonePattern } from "./pinyin";

/**
 * 判断是否是火山引擎 ARK API
 */
function isArkAPI(baseURL: string): boolean {
  return baseURL.includes("volces.com") || baseURL.includes("volcengine.com");
}

/**
 * 调用火山引擎 ARK /responses 端点
 */
async function callArkAPI(
  baseURL: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = `${baseURL.replace(/\/+$/, "")}/responses`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: systemPrompt,
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userPrompt,
            },
          ],
        },
      ],
      temperature: 0.8,
      max_output_tokens: 16000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("ARK API 错误:", response.status, errorBody);
    throw new Error(`AI 服务返回错误 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  // ARK /responses 返回格式：
  // { output: [ { type: "reasoning", ... }, { type: "message", content: [ { type: "output_text", text: "..." } ] } ] }
  const output = data.output;
  if (Array.isArray(output)) {
    for (const item of output) {
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const block of item.content) {
          if (block.type === "output_text" && block.text) {
            return block.text;
          }
        }
      }
    }
  }

  // 兼容：有些版本可能直接返回 choices 格式
  if (data.choices && data.choices[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  console.error(
    "ARK API 返回结构异常:",
    JSON.stringify(data).slice(0, 500)
  );
  throw new Error("AI 返回格式异常，无法提取内容");
}

/**
 * 调用 OpenAI 兼容的 /chat/completions 端点（DeepSeek / OpenAI 等）
 */
async function callOpenAICompatibleAPI(
  baseURL: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const url = `${baseURL.replace(/\/+$/, "")}/chat/completions`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("OpenAI API 错误:", response.status, errorBody);
    throw new Error(`AI 服务返回错误 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error("AI 未返回有效内容");
  }

  return text;
}

/**
 * 统一 AI 调用入口
 */
async function callAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_BASE_URL || "https://api.deepseek.com/v1";
  const model = process.env.AI_MODEL || "deepseek-chat";

  if (!apiKey) {
    throw new Error("未配置 AI API Key，请设置 AI_API_KEY 环境变量");
  }

  if (isArkAPI(baseURL)) {
    return callArkAPI(baseURL, apiKey, model, systemPrompt, userPrompt);
  } else {
    return callOpenAICompatibleAPI(
      baseURL,
      apiKey,
      model,
      systemPrompt,
      userPrompt
    );
  }
}

/**
 * 构建取名 Prompt
 */
function buildPrompt(
  surname: string,
  gender: string,
  candidates: CuratedVerse[]
): string {
  const genderText =
    gender === "male" ? "男孩" : gender === "female" ? "女孩" : "男女皆宜";

  const versesText = candidates
    .map(
      (v, i) =>
        `${i + 1}. 「${v.text}」—— ${v.author}《${v.title}》（${v.collection}）`
    )
    .join("\n");

  return `你是一位精通中国古典文学的取名大师。请从以下古诗词中为姓"${surname}"的${genderText}取6个好名字。

## 候选诗句
${versesText}

## 取名策略
名字的每个字都必须出自同一句诗，但不要求是连续的字。可以灵活运用以下组合方式：
- **连续取字**：如「上善若水」→ 若水
- **隔字组合**：如「上善若水」→ 善水；「春风又绿江南岸」→ 春南、风岸
- **首尾呼应**：如「明月松间照」→ 明照
- **单字取名**：取一个最有意境的字也可以

## 取名要求
1. 每个名字取1-2个字（不含姓），每个字都必须出自给定的同一句诗
2. 6个名字中，至少2个使用隔字组合（非连续取字），体现巧思
3. 名字要好听、有意境、寓意美好
4. 注意与姓氏搭配的音韵和谐度，避免不雅谐音
5. 多样化：涵盖不同诗句、不同意境风格、不同组合方式

## 输出格式
请严格以 JSON 数组格式输出，每个元素包含：
\`\`\`json
[
  {
    "givenName": "名（不含姓）",
    "sourceText": "出处的诗句原文",
    "sourceTitle": "篇名",
    "sourceAuthor": "作者",
    "sourceDynasty": "朝代",
    "sourceCollection": "典籍分类",
    "sourceFullText": "包含该诗句的完整段落",
    "nameReason": "取名释义：为什么从这句诗中选这几个字，约80字",
    "meaning": "寓意解读：这个名字寄托了什么美好愿望，约60字",
    "imagery": "意境描绘：用优美的语言描绘这个名字的画面感，约80字"
  }
]
\`\`\`

只输出 JSON 数组，不要输出其他内容。`;
}

/**
 * 构建「指定字取名」专用 Prompt
 */
function buildDesignatedCharPrompt(
  surname: string,
  gender: string,
  designatedChar: string,
  candidates: CuratedVerse[]
): string {
  const genderText =
    gender === "male" ? "男孩" : gender === "female" ? "女孩" : "男女皆宜";

  const versesText = candidates
    .map(
      (v, i) =>
        `${i + 1}. 「${v.text}」—— ${v.author}《${v.title}》（${v.collection}）\n   完整诗段：${v.fullText}`
    )
    .join("\n");

  return `你是一位精通中国古典文学的取名大师。用户希望名字中包含「${designatedChar}」字。请从以下包含该字的诗句中，为姓"${surname}"的${genderText}取6个好名字。

## 包含「${designatedChar}」字的候选诗句
${versesText}

## 取名要求
1. **每个名字必须包含「${designatedChar}」字**
2. 名字取1-2个字（不含姓），另一个字也必须出自同一句诗（可以是完整诗段中的字）
3. 「${designatedChar}」可以在前也可以在后（如「${designatedChar}X」或「X${designatedChar}」）
4. 也可以只用「${designatedChar}」一个字作为单字名
5. 名字要好听、有意境、寓意美好
6. 注意与姓氏"${surname}"搭配的音韵和谐度，避免不雅谐音
7. 多样化：尽量来自不同诗句，展现不同意境

## 输出格式
请严格以 JSON 数组格式输出，每个元素包含：
\`\`\`json
[
  {
    "givenName": "名（不含姓）",
    "sourceText": "出处的诗句原文",
    "sourceTitle": "篇名",
    "sourceAuthor": "作者",
    "sourceDynasty": "朝代",
    "sourceCollection": "典籍分类",
    "sourceFullText": "包含该诗句的完整段落",
    "nameReason": "取名释义：为什么从这句诗中选这几个字组合，约80字",
    "meaning": "寓意解读：这个名字寄托了什么美好愿望，约60字",
    "imagery": "意境描绘：用优美的语言描绘这个名字的画面感，约80字"
  }
]
\`\`\`

只输出 JSON 数组，不要输出其他内容。`;
}

/**
 * 解析 AI 返回的 JSON
 */
function parseAIResponse(content: string): Record<string, string>[] {
  // 1. 先尝试从 markdown 代码块中提取
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const innerContent = codeBlockMatch[1].trim();
    const arrayMatch = innerContent.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // 继续尝试其他方式
      }
    }
  }

  // 2. 直接从全文中提取 JSON 数组
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // 尝试修复常见问题：去除多余逗号
      const cleaned = jsonMatch[0]
        .replace(/,\s*}/g, "}")
        .replace(/,\s*\]/g, "]");
      try {
        return JSON.parse(cleaned);
      } catch {
        // 可能是被截断了，尝试修复截断的 JSON
        const repaired = repairTruncatedJSON(jsonMatch[0]);
        if (repaired) {
          try {
            return JSON.parse(repaired);
          } catch {
            // 最终失败
          }
        }
      }
    }
  }

  console.error(
    "无法从 AI 返回中提取 JSON，原始内容:",
    content.slice(0, 500)
  );
  throw new Error("AI 返回格式异常，无法解析 JSON");
}

/**
 * 尝试修复被截断的 JSON 数组
 * 例如 [{"a":"1"},{"a":"2"},{"a":"3  被截断
 */
function repairTruncatedJSON(text: string): string | null {
  // 找到最后一个完整的 },
  // 然后关闭数组
  const lastCompleteObj = text.lastIndexOf("},");
  if (lastCompleteObj === -1) {
    // 试试最后一个 }
    const lastObj = text.lastIndexOf("}");
    if (lastObj > 0) {
      return text.slice(0, lastObj + 1) + "]";
    }
    return null;
  }

  return text.slice(0, lastCompleteObj + 1) + "]";
}

/**
 * 核心：生成名字
 */
export async function generateNames(
  request: GenerateNamesRequest
): Promise<NameResult[]> {
  const { surname, gender, collections, excludeNames, batchIndex, designatedChar } = request;

  let userPrompt: string;

  if (designatedChar) {
    // === 指定字模式 ===
    const candidates = searchVersesByChar(designatedChar, {
      collections: collections.length > 0 ? collections : undefined,
      gender,
    });

    if (candidates.length === 0) {
      throw new Error(
        `未在经典诗句中找到含「${designatedChar}」的诗句，建议换个字试试`
      );
    }

    // 打乱后取最多 15 条
    const shuffled = shuffleArray(candidates).slice(0, 15);
    userPrompt = buildDesignatedCharPrompt(surname, gender, designatedChar, shuffled);
  } else {
    // === 普通模式 ===
    const candidates = getCandidateVerses(
      {
        collections: collections.length > 0 ? collections : undefined,
        gender,
      },
      15
    );

    if (candidates.length === 0) {
      throw new Error("没有找到匹配的诗句，请尝试调整筛选条件");
    }

    userPrompt = buildPrompt(surname, gender, candidates);
  }

  // 2. 调用 AI
  const systemPrompt =
    "你是一位精通中国古典文学的取名大师，学识渊博，对诗经、楚辞、唐诗、宋词等经典了然于胸。你取的名字既有文化底蕴，又好听好记。回答务必使用 JSON 格式。";
  const responseText = await callAI(systemPrompt, userPrompt);

  // 3. 解析结果
  const rawNames = parseAIResponse(responseText);

  // 4. 组装并添加拼音
  const names: NameResult[] = rawNames
    .filter((raw) => {
      const fullName = surname + raw.givenName;
      return !excludeNames.includes(fullName);
    })
    .slice(0, 6)
    .map((raw, index) => {
      const fullName = surname + raw.givenName;
      const pinyinFull = getPinyin(fullName);
      const pinyinGiven = getPinyin(raw.givenName);
      const tonePattern = getTonePattern(fullName);

      return {
        id: `${batchIndex}-${index}-${Date.now()}`,
        fullName,
        givenName: raw.givenName,
        pinyin: pinyinFull,
        pinyinGiven,
        tonePattern,
        source: {
          text: raw.sourceText,
          fullText: raw.sourceFullText || raw.sourceText,
          title: raw.sourceTitle,
          author: raw.sourceAuthor,
          dynasty: raw.sourceDynasty,
          collection: raw.sourceCollection,
        },
        interpretation: {
          nameReason: raw.nameReason,
          meaning: raw.meaning,
          imagery: raw.imagery,
        },
        verified: true,
      };
    });

  return names;
}
