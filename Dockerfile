# =============================================================
# 阶段 1: 构建阶段 (Builder) — 编译 React 前端
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖配置
COPY package.json package-lock.json* ./
RUN npm install --registry=https://registry.npmmirror.com

# 复制源代码并编译
COPY . .
RUN npm run build


# =============================================================
# 阶段 2: 运行阶段 (Runner) — 精简镜像
# =============================================================
FROM node:20-alpine

# 设置时区与常用的国内镜像源（可选）
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.ustc.edu.cn/g' /etc/apk/repositories && \
    apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

# 安装运行时必需的最小化工具：
# - python3, py3-requests, py3-beautifulsoup4: 用于数据处理和采集脚本
# - git: 用于 Admin Console 同步数据回 GitHub
# - jq: 用于解析 json (Workflow/Scripts)
# - docker-cli: 仅当需要触发自更新时有用，保持轻量级
RUN apk add --no-cache python3 py3-requests py3-beautifulsoup4 git jq docker-cli && \
    ln -sf /usr/bin/python3 /usr/bin/python

# 安装 Node.js 生产环境依赖
COPY package.json package-lock.json* ./
RUN npm pkg delete scripts.prepare && \
    npm install --production --registry=https://registry.npmmirror.com

# 从 builder 阶段复制前端静态产物
COPY --from=builder /app/dist ./dist

# 复制后端服务程序及必要的运行脚本
COPY server.cjs .
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh

# 复制核心脚本与基础数据 (排除 .git, node_modules 等已在 .dockerignore 中定义的目录)
COPY scripts ./scripts
COPY public ./public
COPY f1_storage ./f1_storage
COPY collector ./collector

# 暴露端口
EXPOSE 8001

# 启动容器
ENTRYPOINT ["./entrypoint.sh"]
