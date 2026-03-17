const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 8001;

// 1. 配置存储目录
// 在无状态模式下，镜像内部已预置了 f1_storage，内含 f1.db 和 photos
const STORAGE_ROOT = process.env.F1_STORAGE_ROOT || path.join(__dirname, 'f1_storage');

// 2. 静态文件服务
// A. 托管编译后的前端页面 (React App)
app.use(express.static(path.join(__dirname, 'dist')));

// B. 托管数据文件 (f1.db 等)
// 前端 fetch('/data/f1.db') 会被映射到 f1_storage/f1.db
app.use('/data', express.static(STORAGE_ROOT));

// C. 托管车手与车队照片
// 前端 fetch('/photos/xxx.webp') 会被映射到 f1_storage/photos/xxx.webp
app.use('/photos', express.static(path.join(STORAGE_ROOT, 'photos')));


// 3. 自更新 API (仅在非测试环境下运行)
const DOCKER_IMAGE = process.env.DOCKER_IMAGE || 'dudumin/f1express:latest';
const DOCKER_API_VERSION = process.env.DOCKER_API_VERSION || '1.43';
const dockerEnv = { ...process.env, DOCKER_API_VERSION };

const updateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 限制 5 分钟内最多请求 5 次更新检查
    message: { error: '更新请求过于频繁，请稍后再试' }
});

// GET /api/check-update — 检查 Docker Hub 是否有新镜像
app.get('/api/check-update', updateLimiter, (req, res) => {
    console.log(`[Update] Checking for new image: ${DOCKER_IMAGE}`);
    
    // 执行 docker pull 检查新版本
    exec(`docker pull ${DOCKER_IMAGE}`, { env: dockerEnv }, (err, stdout, stderr) => {
        if (err) {
            console.error('[Update] docker pull failed:', err.message);
            return res.status(500).json({ hasUpdate: false, error: `检查失败: 无法连接 Docker 服务（请确认已映射 docker.sock）` });
        }
        
        const output = stdout + stderr;
        // 如果输出包含 "Image is up to date"，说明没有更新
        const isUpToDate = output.includes('Image is up to date') || output.includes('Status: Image is up to date');
        
        console.log(`[Update] Pull result: ${isUpToDate ? 'up to date' : 'NEW IMAGE available'}`);
        res.json({
            hasUpdate: !isUpToDate,
            message: isUpToDate ? '✅ 当前已是最新镜像版本' : '🆕 发现新版本镜像，可以立即更新',
            image: DOCKER_IMAGE
        });
    });
});

// POST /api/self-update — 触发容器自更新
app.post('/api/self-update', updateLimiter, (req, res) => {
    if (!fs.existsSync('/var/run/docker.sock')) {
        return res.status(500).json({
            error: `Docker Socket 未挂载，无法执行更新`
        });
    }

    console.log('[Update] Self-update triggered via Watchtower...');
    res.json({ status: 'restarting', message: '自更新指令已发出，容器将在几秒内重启...' });

    setTimeout(() => {
        // 使用 once 模式的 Watchtower 来重启当前容器
        const watchtowerCmd = `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower --run-once --cleanup f1express`;
        
        exec(watchtowerCmd, { env: dockerEnv }, (err, stdout, stderr) => {
            if (err) {
                console.error(`[Update] Watchtower error: ${err.message}`);
            } else {
                console.log(`[Update] Watchtower output: ${stdout}`);
            }
        });
    }, 1000);
});

// 4. SPA 路由回退 (处理前端路由刷新 404 问题)
app.get('/:any*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 5. 启动程序
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`=================================================`);
        console.log(`F1 Express Server (Stateless) Mode`);
        console.log(`Port:           ${PORT}`);
        console.log(`Storage Root:   ${STORAGE_ROOT}`);
        console.log(`Registry Path:  /data -> f1.db`);
        console.log(`Registry Path:  /photos -> images`);
        console.log(`=================================================`);
    });
}

module.exports = app;
