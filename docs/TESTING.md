# f1express 测试规范与指南

为了确保 F1 历史数据的绝对准确性以及一体化平台的稳定性，本项目采用多层次的自动化测试体系。

## 1. 测试层次结构

| 层次 | 目标 | 工具 | 执行频率 |
| :--- | :--- | :--- | :--- |
| **单元测试 (Unit)** | 逻辑函数、React 组件、Hook、数值计算 | Vitest / Jest | 开发阶段 / PR |
| **API 测试 (Backend)** | Express 路由、CSV 处理逻辑、文件同步 | Vitest | 开发阶段 / PR |
| **采集器测试 (Collector)** | 网页解析、JSON 构造、URL 提取 | Pytest | 数据采集更新时 |
| **数据完整性 (Integrity)** | 数据库断言、历史冠军核对、统计对齐 | Python / Assertions | 管线运行后 (Step 13) |

---

## 2. 前端测试 (Frontend)

使用 **Vitest** + **React Testing Library**。

- **目录**: `src/**/__tests__/*.test.tsx`
- **命令**: `npm run test` 或 `npm run test:ui`
- **重点**:
  - `useF1Data`: 数据库连接与查询转换。
  - `useDynamic2026Data`: ghproxy 同步与本地兜底。
  - `RaceCountdown`: 倒计时逻辑及其异常边界。

---

## 3. 后端测试 (Server)

针对 `server.cjs` 的集成测试。

- **目录**: `tests/server/*.test.js`
- **重点**:
  - `/api/upload-csv`: 文件合法性校验。
  - `/api/check-update`: 版本比对逻辑。
  - `/api/self-update`: 触发 Watchtower 的安全性。

---

## 4. 采集器与管线测试 (Python)

使用 **Pytest** 对 Python 模块进行单元测试。

- **目录**: `collector/tests/*.py` 和 `scripts/tests/*.py`
- **重点**:
  - `scraper.py`: URL Regex 匹配。
  - `recalculate_championships`: 历史积分规则逻辑回归。
  - `mappings`: 映射冲突检测。

---

## 5. 数据完整性断言 (Data Integrity Gate)

这是项目的“生命线”，由 `scripts/tests/test_data_integrity.py` 执行 62+ 项断言：

- **WDC 校验**: 1950-2025 年历任世界冠军 ID 与姓名必须与 F1 官方一致。
- **统计校验**: 传奇车手（Schumacher, Hamilton 等）的生涯总分、胜场、杆位数量必须 100% 对齐。
- **关联测试**: 所有 `race_results` 必须在 `drivers` 表有主外键关联。

---

## 6. 测试规则 (Ground Rules)

1. **失败即停止**：在 CI/CD 中，任何测试失败都必须阻止 Docker 镜像的推送。
2. **数据隔离**：进行数据库测试时，必须使用内存数据库或临时 DB 副本。
3. **Mock 外部请求**：采集器测试必须使用 `responses` 或 `mock` 库，严禁测试过程中发起真实的 HTTP 请求（除非是集成环境）。
4. **覆盖率要求**：核心业务逻辑（冠军计算、数据映射）分支覆盖率应达到 90% 以上。
