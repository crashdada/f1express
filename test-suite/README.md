# F1 Express 测试套件

本目录包含 F1 Express 项目的扩展测试用例，与 `src/__tests__` 和 `tests/` 目录互补。

## 目录结构

```
test-suite/
├── README.md                    # 本文件
├── utils/
│   ├── translations.test.ts     # 翻译工具测试
│   └── platform.test.ts         # 平台检测工具测试
├── hooks/
│   └── useF1Data.test.ts        # F1 数据 Hook 测试
├── components/
│   └── RaceCountdown.test.tsx  # 倒计时组件测试
└── integration/
    └── README.md                # 集成测试说明
```

## 测试命令

```bash
# 运行所有测试
npm run test

# 运行特定测试套件
npm run test run test-suite/utils/
npm run test run test-suite/hooks/
npm run test run test-suite/components/

# 运行带覆盖率的测试
npm run test:coverage
```

## 测试覆盖模块

| 模块           | 文件                   | 测试数量 | 状态 |
| -------------- | ---------------------- | -------- | ---- |
| 翻译工具       | translations.test.ts   | 10       | ✅   |
| 平台检测       | platform.test.ts       | 7        | ✅   |
| useF1Data Hook | useF1Data.test.ts      | 8        | ✅   |
| RaceCountdown  | RaceCountdown.test.tsx | 3        | ✅   |

## 新增测试用例说明

### utils/translations.test.ts

- 测试赛道名称翻译 (CIRCUIT_TRANSLATIONS)
- 测试国家名称翻译 (COUNTRY_TRANSLATIONS)
- 测试车队名称翻译 (TEAM_TRANSLATIONS)
- 测试大奖赛名称翻译 (GP_TRANSLATIONS)
- 验证无空翻译值

### utils/platform.test.ts

- 测试 isCapacitor() 函数
- 测试 isAndroid() 函数
- 测试 isIOS() 函数
- 测试 isWeb() 函数

### hooks/useF1Data.test.ts

- 测试 useF1Data 初始状态
- 测试 useF1Data refetch 函数
- 测试 useFilteredDrivers 搜索过滤
- 测试 useFilteredDrivers 按车队过滤
- 测试 useTopDrivers 限制数量

### components/RaceCountdown.test.tsx

- 测试空赛程不渲染
- 测试加载中不渲染
- 测试有比赛时渲染倒计时

## 运行测试的注意事项

1. 确保已安装依赖: `npm install`
2. 测试使用 Vitest 框架
3. React 组件测试使用 React Testing Library
4. 部分测试需要 Mock 全局对象 (fetch, indexedDB, Capacitor)

## 扩展测试

如需添加更多测试:

1. 在对应模块目录下创建 `{module}.test.ts` 或 `{module}.test.tsx`
2. 遵循现有的测试结构和命名规范
3. 运行测试确保通过
