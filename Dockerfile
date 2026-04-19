FROM node:20-alpine AS base

# 安装 better-sqlite3 编译依赖
RUN apk add --no-cache python3 make g++

# ── 依赖安装 ──
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── 构建 ──
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── 运行 ──
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# better-sqlite3 运行时需要 libstdc++
RUN apk add --no-cache libstdc++

# 复制 standalone 输出
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 创建数据目录
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "server.js"]
