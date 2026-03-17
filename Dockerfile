# =============================================================
# 阶段 1: 构建阶段 (Builder) — 编译 React 前端
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖配置 (使用国内镜像加速)
COPY package.json package-lock.json* ./
RUN npm install --registry=https://registry.npmmirror.com

# 复制源代码并编译 (Vite 会根据现有 JSON 构建页面)
COPY . .
RUN npm run build


# =============================================================
# 阶段 2: 运行阶段 (Runner) — 极致精简镜像 (Stateless v1.1.2)
# =============================================================
FROM node:20-alpine

# 设置时区
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

# 安装最小化工具 (只需 docker-cli 用于触发 Watchtower 更新)
# 彻底移除 python3, git 等不再需要的依赖
RUN apk add --no-cache docker-cli

# 安装生产环境 Node.js 依赖
COPY package.json package-lock.json* ./
RUN npm pkg delete scripts.prepare && \
    npm install --production --registry=https://registry.npmmirror.com

# 从 builder 阶段复制编译后的前端产物
COPY --from=builder /app/dist ./dist

# 复制后端服务及启动脚本
COPY server.cjs .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# 复制运行所需的固化数据 (由 GitHub Actions 事先处理好)
# 这里的 f1_storage 包含最新的 f1.db 和 assets
COPY f1_storage ./f1_storage

# 暴露端口
EXPOSE 8001

# 启动容器
ENTRYPOINT ["./entrypoint.sh"]
