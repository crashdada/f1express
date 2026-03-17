# =============================================================
# 阶段 1: 构建阶段 (Builder) — 编译 React 前端
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --registry=https://registry.npmmirror.com

COPY . .
RUN npm run build


# =============================================================
# 阶段 2: 运行阶段 (Runner) — 精简镜像，只含运行时依赖
# =============================================================
FROM node:20-alpine

# 时区与镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

# Python 环境（用于数据同步脚本）+ git（用于 NAS 推送回 GitHub）+ docker-cli（用于自更新）
RUN apk add --no-cache python3 py3-pip py3-pandas py3-requests py3-beautifulsoup4 git rsync docker-cli docker-compose jq && \
    ln -sf /usr/bin/python3 /usr/bin/python

# Node.js 生产依赖
COPY package.json package-lock.json* ./
RUN npm pkg delete scripts.prepare && npm install --production --registry=https://registry.npmmirror.com

# ── 前端产物 ───────────────────────────────────────────────
COPY --from=builder /app/dist ./dist

# ── 后端与数据处理脚本 ──────────────────────────────────────
COPY server.cjs .
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

COPY scripts ./scripts
COPY public ./public
COPY f1_storage ./f1_storage
COPY .git ./.git

# ── f1-collector 脚本 (Integrated) ───
COPY collector ./collector

# =============================================================
EXPOSE 8001

# 直接启动 entrypoint
ENTRYPOINT ["./entrypoint.sh"]
