const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 8001;

// 1. 配置存储目录 (NAS 模式下指向挂载路径，否则指向内置)
const STORAGE_ROOT = process.env.F1_STORAGE_ROOT || path.join(__dirname, 'f1_storage');

// 2. 静态文件服务 (注意顺序)

// A. /data 路由：依次查找内置 dist/data 和外部挂载 f1_storage
// 这一步关键：防止 Catch-all 把 .db 或 .json 解析成 HTML
app.use('/data', express.static(path.join(__dirname, 'dist', 'data')));
app.use('/data', express.static(STORAGE_ROOT));

// B. /photos 路由：托管车手与车队照片
app.use('/photos', express.static(path.join(STORAGE_ROOT, 'photos')));

// C. 托管编译后的前端页面 (React App)
app.use(express.static(path.join(__dirname, 'dist')));

// 3. 自更新 API
const DOCKER_IMAGE = process.env.DOCKER_IMAGE || 'dudumin/f1express:latest';
const DOCKER_API_VERSION = process.env.DOCKER_API_VERSION || '1.43';
const dockerEnv = { ...process.env, DOCKER_API_VERSION };

const updateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    message: { error: '更新请求过于频繁，请稍后再试' }
});

app.get('/api/check-update', updateLimiter, (req, res) => {
    console.log(`[Update] Checking for new image: ${DOCKER_IMAGE}`);
    exec(`docker pull ${DOCKER_IMAGE}`, { env: dockerEnv }, (err, stdout, stderr) => {
        if (err) {
            console.error('[Update] docker pull failed:', err.message);
            return res.status(500).json({ hasUpdate: false, error: '无法获取更新，请检查 docker.sock 挂载' });
        }
        const isUpToDate = stdout.includes('Image is up to date') || stdout.includes('Status: Image is up to date');
        res.json({
            hasUpdate: !isUpToDate,
            message: isUpToDate ? '✅ 已是最新镜像版本' : '🆕 发现新版本镜像',
            image: DOCKER_IMAGE
        });
    });
});

app.post('/api/self-update', updateLimiter, (req, res) => {
    if (!fs.existsSync('/var/run/docker.sock')) {
        return res.status(500).json({ error: 'Docker Socket 未挂载' });
    }
    console.log('[Update] Self-update triggered...');
    res.json({ status: 'restarting', message: '容器将在 30-60 秒内重启应用新镜像...' });
    setTimeout(() => {
        exec(`docker run --rm -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower --run-once --cleanup f1express`, { env: dockerEnv });
    }, 1000);
});

// 4. SPA 路由回退 (Catch-all)
// ！！！极其重要：必须排除数据和照片路径，否则当这些资源缺失时，前端会收到 index.html 并报数据库解析错误
app.use((req, res) => {
    const isDataOrPhoto = req.path.startsWith('/data/') || req.path.startsWith('/photos/') || req.path.includes('.db') || req.path.includes('.json');
    
    if (isDataOrPhoto) {
        console.warn(`[404] Missing resource requested: ${req.path}`);
        return res.status(404).json({ error: 'Data or photo not found' });
    }

    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 5. 启动程序
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`F1 Express Server (Stateless Ready)`);
    console.log(`Port: ${PORT}`);
    console.log(`Storage: ${STORAGE_ROOT}`);
    console.log(`Fallback Strategy Enabled: /data -> dist/data OR f1_storage`);
    console.log(`=================================================`);
});
