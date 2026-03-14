#!/bin/sh
# F1 Website Docker Entrypoint
# 职责：初始化 Volume 挂载点（首次部署时从镜像数据填充），然后启动 Web 服务器
#
# Volume 策略：
#   /app/dist/data  → f1_data volume：持久化 f1.db + JSON（热更新目标）
#   /app/uploads    → f1_uploads volume：上传暂存区
#   /app/csv        ← 不挂载 volume，使用镜像层 + 容器可写层
#                     上传后 git push → 下次镜像重建固化

set -e

DATA_VOL=/app/dist/data
DATA_DEF=/app/dist_data_default  # 镜像构建时备份的 dist/data 快照

echo "============================================"
echo "[Entrypoint] F1 Website Container Starting..."
echo "============================================"

# 1. 初始化 dist/data Volume
mkdir -p "$DATA_VOL"

if [ -d "$DATA_DEF" ]; then
    # 1a. JSON 文件：同步逻辑
    #     策略：镜像中的 JSON 是构建时确定的“好数据”，Volume 中的可能是运行中被污染的。
    #     如果检测到 Volume 中的数据破损，强制恢复。
    for f in "$DATA_DEF"/*.json; do
        [ -f "$f" ] || continue
        FILE_NAME=$(basename "$f")
        DEST="$DATA_VOL/$FILE_NAME"
        
        FORCE_RESET=0
        if [ "$FILE_NAME" = "schedule_2026.json" ] && [ -f "$DEST" ]; then
            # 校验：如果本地只有 4 条左右记录，说明被污染了
            # Try to count rounds. Fallback to grep if jq is not available.
            COUNT=0
            if command -v jq >/dev/null 2>&1; then
                COUNT=$(jq '. | length' "$DEST" 2>/dev/null || echo 0)
            else
                # Count occurrences of "roundNumber" as a proxy
                COUNT=$(grep -o '"roundNumber"' "$DEST" | wc -l || echo 0)
            fi
            
            if [ "$COUNT" -lt 20 ]; then
                echo "[Entrypoint] Detected BROKEN $FILE_NAME (Count: $COUNT), forcing restore from image!"
                FORCE_RESET=1
            fi
        fi

        if [ ! -f "$DEST" ] || [ "$FORCE_RESET" -eq 1 ]; then
            cp "$f" "$DEST"
            JSON_COUNT=$((JSON_COUNT + 1))
        fi
    done
    [ "$JSON_COUNT" -gt 0 ] && echo "[Entrypoint] Restored/Synced $JSON_COUNT JSON files from image"

    # 1b. f1.db：Volume 优先（NAS 本地修改优先保留）
    #     仅当 Volume 中没有 f1.db 时，才从镜像初始化（首次部署）
    if [ ! -f "$DATA_VOL/f1.db" ]; then
        if [ -f "$DATA_DEF/f1.db" ]; then
            cp "$DATA_DEF/f1.db" "$DATA_VOL/f1.db"
            echo "[Entrypoint] f1.db initialized from image (first run)"
        else
            echo "[Entrypoint] WARNING: No f1.db found in image defaults"
        fi
    else
        SIZE=$(du -h "$DATA_VOL/f1.db" 2>/dev/null | cut -f1 || echo "?")
        echo "[Entrypoint] f1.db preserved from volume ($SIZE)"
    fi
else
    echo "[Entrypoint] WARNING: dist_data_default not found, skipping init"
fi

echo "[Entrypoint] Data volume ready at $DATA_VOL"
echo "[Entrypoint] NAS_MODE=${NAS_MODE:-false}"
echo "============================================"
echo "[Entrypoint] Starting node server.cjs..."
echo ""

exec node server.cjs
