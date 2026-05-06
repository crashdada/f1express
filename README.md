# F1 Express

F1 Express 是一个 F1 数据应用，包含：

- 历史数据库：`storage/f1.db`
- 2026 赛季运行时数据：`storage/*.json`
- 前端：React + Vite
- 本地服务：Express

适合本地查看、Docker/NAS 部署，以及赛季数据持续更新。

## 环境要求

- Node.js 20+
- Python 3.9+

## 安装

```bash
npm install
pip install -r collector/requirements.txt
```

## 本地运行

只启动前端：

```bash
npm run dev
```

如果你在处理赛季数据，推荐先同步本地运行时数据再启动：

```bash
npm run dev:sync
```

启动本地服务：

```bash
node server.cjs
```

## 常用命令

测试：

```bash
npm run test
npm run test:unit
npm run test:integration
```

构建：

```bash
npm run build
```

发布前校验：

```bash
npm run verify:dist
npm run validate:team-totals
npm run validate:docker
```

Android 资源同步：

```bash
npm run android:sync
```

## 数据同步

日常同步：

```bash
npm run pipeline:sync
```

强制全量重建：

```bash
npm run pipeline:sync:full
```

发布用重建：

```bash
npm run pipeline:sync:release
```

带车队积分校验的同步：

```bash
npm run pipeline:sync:validate
```

说明：

- `storage/` 是本地运行时数据源
- `dist/` 会提交到仓库，用于直接部署
- `collector/data/`、`storage/`、`dist/data/` 需要保持一致

## 部署

Docker / NAS 常用命令：

```bash
docker compose -f docker/compose.yaml pull
docker compose -f docker/compose.yaml up -d
```

管理接口：

- `GET /api/health`
- `GET /api/check-update`
- `POST /api/self-update`

如果启用了管理令牌：

- 设置环境变量 `ADMIN_API_TOKEN`
- 请求头使用 `x-admin-token`
- 或 `Authorization: Bearer <token>`

## 目录说明

- `src/`：前端代码
- `server/`：本地服务与接口
- `collector/`：赛季采集与处理
- `scripts/`：数据库构建、同步、校验脚本
- `storage/`：运行时数据库、图片、JSON 数据
- `dist/`：构建产物
- `tests/`：前端与服务测试
- `docs/`：补充文档

## 补充文档

- [技术规范](docs/AGENTS.md)
- [测试说明](docs/TESTING.md)
- [更新日志](docs/CHANGELOG.md)
- [规则说明](docs/championship_rules.md)
