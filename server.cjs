const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 8001;

// 1. 配置存储目录 (NAS 模式下指向挂载路径，否则指向内置)
// 统一遵循 f1_storage 规范
const STORAGE_ROOT = process.env.F1_STORAGE_ROOT || path.join(__dirname, 'f1_storage');

// 2. 静态文件服务

// A. /data 路由：托管数据库和 JSON (f1_storage 根目录)
app.use('/data', express.static(STORAGE_ROOT));

// B. /photos 路由：托管照片 (f1_storage/photos)
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
            return res.status(500).json({ hasUpdate: false, error: '无法获取更新，请确认 /var/run/docker.sock 已挂载' });
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
    console.log('[Update] Self-update triggered via Watchtower...');
    res.json({ status: 'restarting', message: '容器将在 30-60 秒内重启应用新镜像...' });
    setTimeout(() => {
        exec(`docker run --rm -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower --run-once --cleanup f1express`, { env: dockerEnv });
    }, 1000);
});

// 4. SPA 路由回退 (Catch-all)
// 排除数据请求，防止 404 时返回 HTML 导致前端解析数据库错误
app.use((req, res) => {
    // 如果是请求特定资源却没找到，直接 404
    const isResource = req.path.includes('.') || req.path.startsWith('/data/') || req.path.startsWith('/photos/');
    if (isResource) {
        return res.status(404).send('Resource Not Found');
    }
    // 否则作为页面路由返回 index.html
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// 5. 启动程序
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`F1 Express Server (Standard f1_storage Mode)`);
    console.log(`Port: ${PORT}`);
    console.log(`Storage: ${STORAGE_ROOT}`);
    
    // 启动时检查关键数据文件
    const dbPath = path.join(STORAGE_ROOT, 'f1.db');
    if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log(`✅ Database found: ${dbPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
        console.error(`❌ Database NOT found: ${dbPath}`);
    }
    
    const photosPath = path.join(STORAGE_ROOT, 'photos');
    if (fs.existsSync(photosPath)) {
        console.log(`✅ Photos directory found: ${photosPath}`);
    } else {
        console.error(`❌ Photos directory NOT found: ${photosPath}`);
    }
    
    console.log(`=================================================`);
});
