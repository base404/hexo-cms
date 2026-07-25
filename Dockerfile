# ==========================================
# Stage 1: Build Frontend and Backend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖描述文件
COPY package*.json ./

# 安装构建所需依赖
RUN npm ci

# 复制项目源代码
COPY . .

# 执行前端和后端构建
RUN npm run build:client && npm run build:server

# ==========================================
# Stage 2: Production Runtime
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

# 安装 Git 及 OpenSSH（支持 Hexo 源码管理及远程 Git 仓库部署）
RUN apk add --no-cache git openssh-client

ENV NODE_ENV=production \
    PORT=4001

# 复制依赖描述文件并仅安装生产依赖
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

# 暴露 4001 (Hexo CMS Web/API) 与 4000 (Hexo Server 预览)
EXPOSE 4001 4000

# 启动服务
CMD ["node", "dist/index.js"]
