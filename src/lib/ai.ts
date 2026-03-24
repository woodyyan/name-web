import type {
  NameResult,
  NameResultLite,
  NameDetailData,
  GenerateNamesRequest,
} from "./types";
import { getPinyin, getTonePattern } from "./pinyin";

/**
 * 判断是否是火山引擎 ARK API
 */
function isArkAPI(baseURL: string): boolean {
  return baseURL.includes("volces.com") || baseURL.includes("volcengine.com");
}

/**
 * 调用火山引擎 ARK /responses 端点（已关闭 thinking）
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
      thinking: { type: "disabled" },
      temperature: 0.8,
      max_output_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("ARK API 错误:", response.status, errorBody);
    throw new Error(`AI 服务返回错误 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();

  // ARK /responses 返回格式：
  // { output: [ { type: "message", content: [ { type: "output_text", text: "..." } ] } ] }
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

// ============================================
// 轻量版 Prompt（快速出名字，不含详解）
// ============================================

function buildLitePrompt(
  surname: string,
  gender: string,
  collections: string[]
): string {
  const genderText =
    gender === "male" ? "男孩" : gender === "female" ? "女孩" : "男女皆宜";

  const collectionText =
    collections.length > 0
      ? `请从以下典籍中选取：${collections.join("、")}。`
      : "请从诗经、楚辞、唐诗、宋词、元曲、古文观止、论语、孟子、道德经、庄子等经典中选取。";

  return `为姓"${surname}"的${genderText}取9个好名字。${collectionText}

要求：
1. 每个名字1-2个字（不含姓），出自同一句真实古诗词
2. 名字好听、有意境、寓意美好，与姓氏音韵和谐
3. 9个名字来自不同诗文，风格多样
4. 至少3个使用非连续取字（隔字组合）
5. 引用的诗句必须真实存在，严禁编造

输出JSON数组，只要这些字段：
\`\`\`json
[
  {
    "givenName": "名",
    "sourceText": "诗句原文",
    "sourceTitle": "篇名",
    "sourceAuthor": "作者",
    "sourceDynasty": "朝代",
    "sourceCollection": "典籍分类"
  }
]
\`\`\`
只输出JSON，不要其他内容。`;
}

function buildDesignatedCharLitePrompt(
  surname: string,
  gender: string,
  designatedChar: string,
  collections: string[]
): string {
  const genderText =
    gender === "male" ? "男孩" : gender === "female" ? "女孩" : "男女皆宜";

  const collectionText =
    collections.length > 0
      ? `请从以下典籍中寻找：${collections.join("、")}。`
      : "请从诗经、楚辞、唐诗、宋词、元曲、古文观止、论语、孟子、道德经、庄子等经典中寻找。";

  return `名字中必须包含「${designatedChar}」字。为姓"${surname}"的${genderText}取9个好名字。${collectionText}

要求：
1. 每个名字必须包含「${designatedChar}」字，1-2个字（不含姓）
2. 「${designatedChar}」必须真实出现在引用的诗句中
3. 另一个字也出自同一句诗文
4. 9个名字来自不同诗文，风格多样
5. 引用的诗句必须真实存在，严禁编造

输出JSON数组，只要这些字段：
\`\`\`json
[
  {
    "givenName": "名",
    "sourceText": "诗句原文",
    "sourceTitle": "篇名",
    "sourceAuthor": "作者",
    "sourceDynasty": "朝代",
    "sourceCollection": "典籍分类"
  }
]
\`\`\`
只输出JSON，不要其他内容。`;
}

// ============================================
// 详解版 Prompt（单个名字的深度解读）
// ============================================

function buildDetailPrompt(
  fullName: string,
  givenName: string,
  sourceText: string,
  sourceTitle: string,
  sourceAuthor: string,
  sourceDynasty: string
): string {
  return `请为名字「${fullName}」（取自"${sourceText}"——${sourceAuthor}《${sourceTitle}》）提供详细解读。

输出JSON，包含以下字段：
\`\`\`json
{
  "sourceFullText": "包含该诗句的完整段落（至少上下文2-4句，真实原文）",
  "nameReason": "取名释义：为什么从这句诗中选「${givenName}」这几个字组合，约80字",
  "meaning": "寓意解读：这个名字寄托了什么美好愿望，约60字",
  "imagery": "意境描绘：用优美的语言描绘这个名字的画面感，约80字"
}
\`\`\`
只输出JSON，不要其他内容。`;
}

// ============================================
// 解析 AI 返回的 JSON
// ============================================

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

function parseAIDetailResponse(content: string): Record<string, string> {
  // 1. 从 markdown 代码块中提取
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const innerContent = codeBlockMatch[1].trim();
    const objMatch = innerContent.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]);
      } catch {
        // 继续
      }
    }
  }

  // 2. 直接提取 JSON 对象
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      const cleaned = jsonMatch[0]
        .replace(/,\s*}/g, "}")
        .replace(/,\s*\]/g, "]");
      try {
        return JSON.parse(cleaned);
      } catch {
        // 失败
      }
    }
  }

  console.error("无法解析详解 JSON:", content.slice(0, 500));
  throw new Error("AI 详解返回格式异常");
}

/**
 * 尝试修复被截断的 JSON 数组
 */
function repairTruncatedJSON(text: string): string | null {
  const lastCompleteObj = text.lastIndexOf("},");
  if (lastCompleteObj === -1) {
    const lastObj = text.lastIndexOf("}");
    if (lastObj > 0) {
      return text.slice(0, lastObj + 1) + "]";
    }
    return null;
  }
  return text.slice(0, lastCompleteObj + 1) + "]";
}

// ============================================
// 导出函数
// ============================================

/**
 * 轻量版：快速生成 9 个名字（不含详解）
 * 用于首屏展示，速度优先
 */
export async function generateNamesLite(
  request: GenerateNamesRequest
): Promise<NameResultLite[]> {
  const { surname, gender, collections, excludeNames, batchIndex, designatedChar } = request;

  let userPrompt: string;

  if (designatedChar) {
    userPrompt = buildDesignatedCharLitePrompt(surname, gender, designatedChar, collections);
  } else {
    userPrompt = buildLitePrompt(surname, gender, collections);
  }

  if (excludeNames.length > 0) {
    userPrompt += `\n\n排除以下已推荐的名字：${excludeNames.join("、")}`;
  }

  const systemPrompt =
    "你是精通中国古典文学的取名大师。引用的诗句必须真实存在，不可编造。回答只用JSON格式。";
  const responseText = await callAI(systemPrompt, userPrompt);

  const rawNames = parseAIResponse(responseText);

  const names: NameResultLite[] = rawNames
    .filter((raw) => {
      const fullName = surname + raw.givenName;
      return !excludeNames.includes(fullName);
    })
    .slice(0, 9)
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
          title: raw.sourceTitle,
          author: raw.sourceAuthor,
          dynasty: raw.sourceDynasty,
          collection: raw.sourceCollection,
        },
      };
    });

  return names;
}

/**
 * 详解版：为单个名字生成详细解读
 * 用于用户点击名字后按需加载
 */
export async function generateNameDetail(
  fullName: string,
  givenName: string,
  sourceText: string,
  sourceTitle: string,
  sourceAuthor: string,
  sourceDynasty: string
): Promise<NameDetailData> {
  const userPrompt = buildDetailPrompt(
    fullName,
    givenName,
    sourceText,
    sourceTitle,
    sourceAuthor,
    sourceDynasty
  );

  const systemPrompt =
    "你是精通中国古典文学的取名大师。引用的诗句必须真实存在。回答只用JSON格式。";
  const responseText = await callAI(systemPrompt, userPrompt);

  const raw = parseAIDetailResponse(responseText);

  return {
    sourceFullText: raw.sourceFullText || sourceText,
    nameReason: raw.nameReason || "",
    meaning: raw.meaning || "",
    imagery: raw.imagery || "",
  };
}

/**
 * 兼容旧接口：一次性生成完整结果（保留向下兼容）
 */
export async function generateNames(
  request: GenerateNamesRequest
): Promise<NameResult[]> {
  // 先获取轻量版
  const liteNames = await generateNamesLite(request);

  // 然后为每个名字生成详解（并行）
  const fullNames = await Promise.all(
    liteNames.map(async (lite) => {
      try {
        const detail = await generateNameDetail(
          lite.fullName,
          lite.givenName,
          lite.source.text,
          lite.source.title,
          lite.source.author,
          lite.source.dynasty
        );
        return {
          ...lite,
          source: {
            ...lite.source,
            fullText: detail.sourceFullText,
          },
          interpretation: {
            nameReason: detail.nameReason,
            meaning: detail.meaning,
            imagery: detail.imagery,
          },
          verified: true,
        } as NameResult;
      } catch {
        // 详解失败时用占位
        return {
          ...lite,
          source: {
            ...lite.source,
            fullText: lite.source.text,
          },
          interpretation: {
            nameReason: "详解加载失败",
            meaning: "",
            imagery: "",
          },
          verified: true,
        } as NameResult;
      }
    })
  );

  return fullNames;
}
