#!/bin/sh
# F1 Website Docker Entrypoint (Stateless Mode)
# 职责：启动 Web 服务器。数据已在构建阶段固化于镜像中。

set -e

echo "================================================="
echo "[Entrypoint] F1 Website (Stateless) Starting..."
echo "[Entrypoint] Source: Internal storage"
echo "================================================="

# 检查并设置存储根目录环境变量（如果 Compose 未提供）
if [ -z "$F1_STORAGE_ROOT" ]; then
    export F1_STORAGE_ROOT=/app/storage
fi

echo "[Entrypoint] F1_STORAGE_ROOT: $F1_STORAGE_ROOT"
echo "[Entrypoint] NAS_MODE: ${NAS_MODE:-false}"
echo "[Entrypoint] Launching Node Server..."
echo "================================================="
echo ""

exec node server.cjs
