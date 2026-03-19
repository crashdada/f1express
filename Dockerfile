FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --registry=https://registry.npmmirror.com

COPY . .
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache docker-cli tzdata && \
    cp /usr/share/zoneinfo/Asia/Shanghai /etc/localtime && \
    echo "Asia/Shanghai" > /etc/timezone

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm pkg delete scripts.prepare && \
    npm install --production --registry=https://registry.npmmirror.com

COPY --from=builder /app/dist ./dist
COPY server.cjs ./
COPY server ./server
COPY entrypoint.sh ./
COPY storage ./storage

RUN chmod +x entrypoint.sh

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8001/api/health >/dev/null || exit 1

ENTRYPOINT ["./entrypoint.sh"]
