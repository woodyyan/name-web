# ============================================
# 诗名 (name-web) — Docker 多阶段构建
# ============================================

# --- 阶段 1：安装依赖 ---
FROM node:20-alpine AS deps
WORKDIR /app

# 安装 libc6-compat（Alpine 上某些 npm 包需要）
RUN apk add --no-cache libc6-compat

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# --- 阶段 2：构建 ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 构建生产版本（output: 'standalone' 在 next.config.ts 中已配置）
RUN npm run build

# --- 阶段 3：生产运行 ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# 安全：使用非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制 public 静态资源
COPY --from=builder /app/public ./public

# standalone 输出包含精简的 node_modules 和 server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
