const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn, execSync, exec } = require('child_process');
const rateLimit = require('express-rate-limit');
const app = express();
const PORT = process.env.PORT || 8001;

// 1. 配置上传与存储分离
const STORAGE_ROOT = process.env.F1_STORAGE_ROOT || path.join(__dirname, 'f1_storage');
const UPLOAD_DIR = path.join(STORAGE_ROOT, 'uploads');
const CSV_DIR = path.join(STORAGE_ROOT, 'csv');
const DATA_DIR = STORAGE_ROOT; // 统一数据根目录

// 确保目录存在
if (!fs.existsSync(STORAGE_ROOT)) fs.mkdirSync(STORAGE_ROOT, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CSV_DIR)) fs.mkdirSync(CSV_DIR);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });

// 2. 静态文件服务 (Hosting the React App)
app.use(express.static(path.join(__dirname, 'dist')));

// 3. API: 接收上传并触发同步流水线
// 定义允许的标准文件名白名单，防止目录穿越攻击
const ALLOWED_CSV_NAMES = new Set([
    'race_results.csv', 'sprint_results.csv', 'race_outline.csv',
    'team_names.csv', 'driver_photos.csv', 'team_photos.csv'
]);

const EXPECTED_HEADERS = {
    'race_results.csv': ['名次', 'NO', '名', '姓', '缩写', '车队', '圈数', '完成时间', '得分', '年份', '场次', '序号'],
    'sprint_results.csv': ['年份', '赛道', '人员列表', '真实排名', '得分'],
    'race_outline.csv': ['年份', '场次', '赛道', 'Time', '名', '姓', '缩写', '国家地区', '开始日期', '结束日期'],
    'team_names.csv': ['参数7_文本', '车队名'],
    'driver_photos.csv': ['NO', '名', '姓', '缩写', '网址', '原始来源'],
    'team_photos.csv': ['车队', '网址', '原始来源']
};

function validateCsvContent(filePath, targetName) {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        // 处理有可能存在的 BOM 头
        const cleanContent = fileContent.charCodeAt(0) === 0xFEFF ? fileContent.slice(1) : fileContent;

        const firstLine = cleanContent.split(/\r?\n/)[0];
        if (!firstLine) return false;

        const headers = firstLine.split(',').map(h => h.trim());
        const expected = EXPECTED_HEADERS[targetName];
        if (!expected) return false;

        // 校验文件头是否包含所有预期的必需字段（Schema validation）
        for (const col of expected) {
            if (!headers.includes(col)) {
                return false;
            }
        }
        return true;
    } catch (e) {
        console.error('[CSV Validation Error]', e);
        return false;
    }
}

const uploadLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 20, // 限制每分钟最多上传20次
    message: { error: '上传请求过于频繁，请稍后再试' }
});

app.post('/api/upload-csv', uploadLimiter, upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    // 优先使用前端传来的 targetName（标准文件名），回退到 originalname
    const requestedName = (req.body.targetName || req.file.originalname).trim();

    // 安全校验：只允许写入预定义的标准 CSV 文件名
    if (!ALLOWED_CSV_NAMES.has(requestedName)) {
        console.error(`[Server] Blocked invalid target filename: ${requestedName}`);
        return res.status(400).json({ error: `Invalid target filename: ${requestedName}` });
    }

    const sourcePath = path.join(UPLOAD_DIR, req.file.originalname);
    const filename = requestedName; // 为后续逻辑定义统一的 filename 变量

    // 安全校验2：CSV 内容 Schema 校验
    if (!validateCsvContent(sourcePath, filename)) {
        console.error(`[Server] Blocked invalid CSV content for: ${filename}`);
        if (fs.existsSync(sourcePath)) fs.unlinkSync(sourcePath);
        return res.status(400).json({ error: `CSV 内容校验失败，请检查文件头格式是否与 ${filename} 匹配` });
    }

    console.log(`[Server] Received ${req.file.originalname} → saving as ${path.relative(__dirname, CSV_DIR)}/${filename}`);

    try {
        const targetPath = path.join(CSV_DIR, filename);
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`[Server] Saved to ${targetPath}`);
    } catch (e) {
        console.error(`[Server] Failed to copy file: ${e.message}`);
        return res.status(500).json({ error: 'File processing failed' });
    }

    runSyncPipeline(filename, res);
});


// 4. 执行自动化脚本流
function runSyncPipeline(triggerFile, res) {
    const scriptPath = path.join(__dirname, 'scripts', 'sync_f1_data.py');

    // A. 运行 Python 同步脚本 (使用 -u 强制实时输出，不缓冲)
    console.log('[Server] Spawning sync_f1_data.py...');
    const python = spawn('python', ['-u', scriptPath], { cwd: __dirname });

    let outputLog = '';

    python.stdout.on('data', (data) => {
        const msg = data.toString();
        outputLog += msg;
        console.log(`[Sync] ${msg.trim()}`); // 恢复实时日志
    });

    python.stderr.on('data', (data) => {
        console.error(`[Sync Error] ${data}`);
    });

    python.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({
                error: 'Sync script failed',
                details: outputLog
            });
        }

        // B. 同步成功，开始 Git 回传
        console.log('[Server] Sync success. Creating Git commit...');
        runGitPush(triggerFile, res);
    });
}

function runGitPush(filename, res) {
    const gitPath = path.join(__dirname, '.git');
    const isGitRepo = fs.existsSync(gitPath);
    const token = process.env.GIT_TOKEN;
    const repoUrl = `https://github.com/crashdada/f1express.git`;

    const authHeaderCommand = token
        ? ['git', ['config', 'http.https://github.com/.extraHeader', `Authorization: Basic ${Buffer.from(`oauth2:${token}`).toString('base64')}`]]
        : null;

    const safeConfigCommand = ['git', ['config', '--global', '--add', 'safe.directory', '*']];

    // 基础配置
    let prepCommands = [safeConfigCommand];
    if (authHeaderCommand) prepCommands.push(authHeaderCommand);

    if (!isGitRepo) {
        console.log('[Git] Initializing new repository...');
        prepCommands.push(['git', ['init']]);
        prepCommands.push(['git', ['remote', 'add', 'origin', repoUrl]]);
    } else {
        console.log('[Git] Refreshing existing repository...');
        prepCommands.push(['git', ['remote', 'set-url', 'origin', repoUrl]]);
    }

    // 无论是否新建，都要 fetch 和 reset
    prepCommands.push(['git', ['fetch', 'origin', 'main']]);
    prepCommands.push(['git', ['reset', '--mixed', 'origin/main']]);

    // 执行准备阶段
    executeCommandsSequentially(prepCommands, 0, (err) => {
        if (err) return sendError(res, err);

        // ---[自动愈合逻辑] ---
        // 检查因 Volume 挂载导致 "丢失" (deleted) 的 CSV 文件
        try {
            console.log('[Git] Checking for missing files to auto-restore...');
            // 获取所有被标记为已删除的 csv 文件
            const csvRelPath = path.relative(__dirname, CSV_DIR).replace(/\\/g, '/');
            const statusOutput = execSync(`git ls-files --deleted ${csvRelPath}/`, { cwd: __dirname, encoding: 'utf-8' }).trim();

            if (statusOutput) {
                const missingFiles = statusOutput.split('\n')
                    .map(f => f.trim())
                    .filter(f => f.endsWith('.csv') && f !== `${csvRelPath}/${filename}`); // 排除刚上传的那个

                if (missingFiles.length > 0) {
                    console.log(`[Git] Restoring ${missingFiles.length} missing CSV files:`, missingFiles);
                    // 恢复这些文件： git checkout HEAD -- csv/file1 csv/file2 ...
                    execSync(`git checkout HEAD -- ${missingFiles.join(' ')}`, { cwd: __dirname });
                }
            }
        } catch (e) {
            console.warn('[Git] Auto-restore warning (non-fatal):', e.message);
        }

        // ---[提交阶段]---
        const pushCommands = [
            ['git', ['add', `${path.relative(__dirname, CSV_DIR).replace(/\\/g, '/')}/*.csv`]],     // 仅同步 CSV 源码
            ['git', ['commit', '-m', `data: update ${filename} via admin console`]],
            ['git', ['push', 'origin', 'main']]
        ];

        executeCommandsSequentially(pushCommands, 0, (err) => {
            if (err) {
                console.error('[Git] Push failed:', err);
                return res.json({
                    status: 'warning',
                    message: `Data synced locally, but Git Push failed: ${err.message}`,
                    file: filename
                });
            }

            console.log('[Git] Push success!');
            res.json({
                status: 'success',
                message: 'Data synced & Pushed to GitHub!',
                file: filename
            });
        });
    });
}

function executeCommandsSequentially(cmds, index, callback) {
    if (index >= cmds.length) return callback(null);

    const [cmd, args] = cmds[index];
    // console.log(`[Exec] ${cmd} ${args.join(' ')}`);

    // 使用 stdio: 'inherit' 以便在 Docker logs 中看到 git 输出
    const proc = spawn(cmd, args, { cwd: __dirname, stdio: 'inherit' });

    proc.on('close', (code) => {
        // git commit 返回 1 表示 nothing to commit，这在我们的场景下允许接受（比如重复上传相同文件）
        if (code !== 0 && cmd === 'git' && args.includes('commit')) {
            console.log('[Git] Nothing to commit, continuing...');
            return executeCommandsSequentially(cmds, index + 1, callback);
        }

        if (code !== 0) {
            return callback(new Error(`${cmd} ${args[0]} failed with code ${code}`));
        }
        executeCommandsSequentially(cmds, index + 1, callback);
    });

    proc.on('error', (err) => {
        return callback(err);
    });
}

function sendError(res, err) {
    console.error('[Server Error]', err);
    res.status(500).json({ error: err.message });
}

// ── 自更新 API ─────────────────────────────────────────────────────────────
const DOCKER_IMAGE = process.env.DOCKER_IMAGE || 'dudumin/f1express:latest';
// Docker API 兼容：NAS 上的旧 Daemon 可能只支持低版本 API
// 通过 DOCKER_API_VERSION 环境变量可在 compose.yaml 中覆盖
const DOCKER_API_VERSION = process.env.DOCKER_API_VERSION || '1.43';
const dockerEnv = { ...process.env, DOCKER_API_VERSION };

// GET /api/check-update — 检查 Docker Hub 是否有新镜像（执行 pull，通过输出判断）
app.get('/api/check-update', (req, res) => {
    console.log(`[Update] Checking for new image: ${DOCKER_IMAGE} (API v${DOCKER_API_VERSION})`);
    exec(`docker pull ${DOCKER_IMAGE}`, { env: dockerEnv }, (err, stdout, stderr) => {
        if (err) {
            console.error('[Update] docker pull failed:', err.message);
            return res.status(500).json({ hasUpdate: false, error: `docker pull 失败: ${err.message}` });
        }
        const output = stdout + stderr;
        const isUpToDate = output.includes('Image is up to date') || output.includes('Status: Image is up to date');
        console.log(`[Update] Pull result: ${isUpToDate ? 'up to date' : 'NEW IMAGE available'}`);
        res.json({
            hasUpdate: !isUpToDate,
            message: isUpToDate ? '✅ 已是最新版本' : '🆕 发现新版本，可以立即更新！',
            image: DOCKER_IMAGE,
        });
    });
});

// POST /api/self-update — 应用新镜像并重建容器
// 流程：先响应前端 → 延迟 0.8s → 使用 Watchtower 在容器外部安全地重建自身
app.post('/api/self-update', (req, res) => {
    // 检查是否存在挂载的 docker.sock (无论使用 compose 还是 watchtower，docker socket 都是必须的)
    if (!fs.existsSync('/var/run/docker.sock')) {
        return res.status(500).json({
            error: `Docker Socket 未挂载到 /var/run/docker.sock，请检查 volumes 配置`
        });
    }

    console.log('[Update] *** Self-update triggered! Container will restart via Watchtower. ***');
    res.json({ status: 'restarting', message: '正在启动 Watchtower 应用更新并保留全部配置，容器将在几秒内重启...', countdown: 30 });

    setTimeout(() => {
        // 使用 Watchtower 作为一次性更新任务运行
        // 它会独立于 f1-website 运行，因此能安全地停止、重建、再启动 f1-website，而不会被自杀中断
        // 并且 Watchtower 会精确复制挂载、端口和所有原有配置，不受宿主机绝对路径变化的干扰
        const watchtowerCmd = `docker run --rm -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower --run-once --cleanup f1express`;

        console.log(`[Update] Executing safety updater: ${watchtowerCmd}`);
        exec(watchtowerCmd, { env: dockerEnv }, (err, stdout, stderr) => {
            if (err) {
                console.error(`[Update] Watchtower failed: ${err.message}`);
                console.warn(`[Update] Stderr: ${stderr}`);
            } else {
                console.log(`[Update] Watchtower successfully recreated container: \n${stdout.trim()}`);
            }
        });
    }, 800);
});


// 启动服务器
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`F1 Admin Server running on port ${PORT}`);
        console.log(`- Upload API:       POST /api/upload-csv`);
        console.log(`- Check Update API: GET  /api/check-update`);
        console.log(`- Self Update API:  POST /api/self-update`);
        console.log(`- Static Web:       Serving ./dist`);
        console.log(`- NAS_MODE:         ${process.env.NAS_MODE || 'false'}`);
    });
}

module.exports = app;
