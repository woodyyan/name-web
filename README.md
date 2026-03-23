# 诗名 — 以诗为名，不负韶华

基于古诗词的智能取名网站。输入姓氏，从诗经、楚辞、唐诗、宋词等经典中精选有出处的好名字。

## ✨ 功能特色

- **诗词取名** — 从精选诗句库中提取灵感，AI 创意组合，每个名字都有出处
- **详细释义** — 点击名字查看原文、释义、寓意、意境、音韵分析
- **拼音标注** — 自动生成拼音和平仄声调
- **性别偏好** — 支持选择男孩名 / 女孩名 / 不限
- **诗集筛选** — 可指定从诗经、楚辞、唐诗、宋词等特定诗集中取名
- **收藏功能** — 本地收藏喜欢的名字，方便对比
- **换一批** — 每次推荐 6 个名字，不满意可以换一批（会话内去重）
- **古风 UI** — 宣纸白底、赭石色主调，Ma Shan Zheng / Noto Serif SC 字体

## 🛠 技术栈

- [Next.js 16](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Framer Motion](https://motion.dev/)（动效）
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro)（拼音转换）
- AI API：支持火山引擎 ARK（豆包）/ DeepSeek / OpenAI

## 📦 本地运行

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd name-web
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
```

编辑 `.env.local`，填入你的 AI API Key：

```env
# 火山引擎 ARK（豆包）— 推荐
AI_API_KEY=your-api-key-here
AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
AI_MODEL=doubao-seed-2-0-pro-260215

# DeepSeek — 备选
# AI_API_KEY=your-api-key-here
# AI_BASE_URL=https://api.deepseek.com/v1
# AI_MODEL=deepseek-chat

# OpenAI — 备选
# AI_API_KEY=sk-xxx
# AI_BASE_URL=https://api.openai.com/v1
# AI_MODEL=gpt-4o-mini
```

> 三选一即可。推荐使用火山引擎 ARK（豆包），性价比高。

### 4. 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 [http://localhost:3999](http://localhost:3999)。

## 🚀 服务器部署

### 方式一：Vercel 部署（推荐）

最简单的部署方式，适合个人项目：

1. 将代码推送到 GitHub
2. 在 [Vercel](https://vercel.com/) 导入该仓库
3. 在 Vercel 项目设置 → Environment Variables 中添加：
   - `AI_API_KEY` = 你的 API Key
   - `AI_BASE_URL` = API 地址
   - `AI_MODEL` = 模型名称
4. 部署完成，Vercel 会自动分配域名

### 方式二：Node.js 服务器部署

适合自有服务器：

```bash
# 1. 安装依赖
npm install

# 2. 构建生产版本
npm run build

# 3. 启动生产服务器
npm start
```

默认监听 3000 端口。可通过 `-p` 参数指定端口：

```bash
npm start -- -p 8080
```

### 方式三：Docker 部署

项目已包含 `Dockerfile`（多阶段构建）和 `.dockerignore`，直接构建即可：

```bash
# 构建镜像
docker build -t shiming .

# 运行容器
docker run -d -p 3000:3000 \
  -e AI_API_KEY=your-api-key \
  -e AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3 \
  -e AI_MODEL=doubao-seed-2-0-pro-260215 \
  --name shiming \
  shiming
```

也可以使用 Docker Compose，创建 `docker-compose.yml`：

```yaml
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - AI_API_KEY=your-api-key
      - AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
      - AI_MODEL=doubao-seed-2-0-pro-260215
    restart: unless-stopped
```

```bash
docker compose up -d
```

> **说明**：`next.config.ts` 已配置 `output: 'standalone'`，生产镜像约 ~150MB，仅包含运行所需的最小依赖。

### 环境变量说明

| 变量 | 必填 | 说明 |
|------|------|------|
| `AI_API_KEY` | ✅ | AI 服务的 API Key |
| `AI_BASE_URL` | ✅ | AI 服务的 API 地址 |
| `AI_MODEL` | ✅ | 使用的模型名称 |

## 📁 项目结构

```
src/
├── app/
│   ├── api/generate-names/   # 取名 API 接口
│   ├── globals.css           # 全局样式（古风主题）
│   ├── layout.tsx            # 根布局
│   └── page.tsx              # 首页
├── components/               # UI 组件
│   ├── NameCard.tsx          # 名字卡片
│   ├── NameDetail.tsx        # 名字详情（释义/寓意）
│   ├── NameGrid.tsx          # 名字网格
│   ├── PreferenceForm.tsx    # 偏好设置表单
│   └── FavoriteBar.tsx       # 收藏栏
├── data/
│   └── curated-verses.json   # 精选诗句库
├── hooks/                    # React Hooks
│   ├── useNameGenerator.ts   # 取名逻辑
│   └── useFavorites.ts       # 收藏逻辑
└── lib/
    ├── ai.ts                 # AI 调用（支持 ARK / OpenAI 兼容格式）
    ├── poetry.ts             # 诗词数据检索
    ├── pinyin.ts             # 拼音工具
    └── types.ts              # 类型定义
```

## 📄 License

MIT
