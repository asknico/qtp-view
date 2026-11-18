# QTP - 个人股票管理系统（前端）

> QTP（Quant Trade Platform）个人股票管理系统的 Web 前端。配套后端仓库 `qtp`。

| 组件/框架 | 版本 |
| :-------- | :--- |
| vben | 5.7.0 |
| antdv-next | 1.3.0 |
| vue | 3.5.13 |
| node | >= 22.16.0 |
| pnpm | >= 11.0.0 |

---

## 系统功能

### 1. 驾驶舱（dashboard）

系统的核心入口，提供多个维度的股票资产视图：

| 页面 | 路径 | 说明 |
| :--- | :--- | :--- |
| 资产总览 | `views/dashboard/asset-overview` | 总资产、持仓市值、收益曲线等资产全景 |
| 今日概览 | `views/dashboard/today-overview` | 当日盈亏、成交、资金变动 |
| 行情概览 | `views/dashboard/market-overview` | 指数/自选股行情速览 |
| 目标进度 | `views/dashboard/goals-progress` | 投资目标与完成进度跟踪 |
| 待办提醒 | `views/dashboard/todo-reminders` | 待办事项与重要节点提醒 |
| 自定义看板 | `views/dashboard/custom-dashboard` | 可自行组合卡片的个性化看板 |
| 工作台 | `views/dashboard/workspace` | 个人工作台，汇总常用信息与快捷入口 |

### 2. 账户与资金 ACC（accounts）

业务核心模块，对应后端 `qtp-modules/qtp-acc`（包 `com.minscope.acc`）：

| 页面 | 路径 | 说明 |
| :--- | :--- | :--- |
| 券商账户 | `views/accounts/broker-accounts` | 券商账户全生命周期管理 |

覆盖的后端领域模型：

- **券商**（AccBroker）：券商基础信息维护
- **券商账户**（AccBrokerAccount）：资金账号、状态、账户卡片
- **股东账户**（AccShareholderAccount）：沪/深股东代码管理
- **银行账户**（AccBankAccount）：三方存管银行卡
- **存管渠道**（AccBrokerChannel）：券商-银行绑定关系
- **费率**（AccBrokerFee）：佣金/印花税/过户费等费率配置
- **融资融券额度**（AccMarginQuota）：两融额度跟踪
- **资金流水**（AccCashFlow）：出入金与资金变动记录
- **每日快照**（AccDailySnapshot）：账户每日资产快照（用于资产曲线）
- **数据同步**（AccSync）：券商数据同步任务发起与结果查看
- **权限**（AccAccountPermLog）：账户看板授权与权限变更日志

### 3. 系统管理（system）

用户、角色、部门、岗位、菜单、字典、参数配置、通知公告、文件管理（OSS 及配置）、客户端管理。

### 4. 系统监控（monitor）

在线用户、登录日志、操作日志、缓存监控、Spring Boot Admin 监控（iframe）。

### 5. 系统工具（tool）

代码生成（gen）：在线生成前后端代码。

### 6. 工作流（workflow）

基于 warm-flow：流程定义、流程实例、待办/已办任务、流程分类、SpEL 表达式扩展。

> `views/演示使用自行删除` 目录为框架自带演示页面，实际部署可整目录删除（需同步清理对应菜单）。

---

## 目录结构

采用 monorepo（pnpm + turbo）分仓结构：

```
qtp-view/
├── apps/
│   └── web-antd/           # 主应用（开发都在这里）
│       └── src/
│           ├── api/        # 接口封装（core/system/monitor/tool/workflow）
│           ├── router/     # 路由（静态路由 + 后端动态菜单）
│           ├── store/      # Pinia 状态
│           ├── views/      # 页面（dashboard/accounts/system/monitor/tool/workflow）
│           └── styles/     # 全局样式（ui.css 存放主题级覆盖规则）
├── packages/               # vben 公共包（@vben/*）
├── internal/               # lint/构建配置
└── scripts/                # 脚本（含后端代码生成模板 antdv-next 专用）
```

---

## 安装使用

### 环境要求

- Node.js >= 22.16.0（影响编辑器格式化，需安装 oxc 插件）
- pnpm >= 11（只能用 pnpm，已通过 `preinstall` 强制）

### 启动

```bash
# 安装依赖
pnpm install

# 启动开发服务（默认端口 5666）
pnpm dev:antd
```

### 打包

```bash
# 生产构建
pnpm build:antd

# 测试环境构建
pnpm build:antd:test
```

### 后端对接

对应后端仓库：`qtp`（Spring Boot，包名 `com.minscope`）。

- 开发环境 API 走 vite 代理：`VITE_GLOB_API_URL=/api`（在 `vite.config.mts` 配置代理目标），生产环境为 `/prod-api`
- **RSA 公私钥必须与后端匹配**：两对密钥——「前端请求加密-后端解密」一对，「后端响应加密-前端解密」一对，在 `.env.development` / `.env.production` 中配置
- 客户端 ID：`VITE_GLOB_APP_CLIENT_ID` 需与后端 `sys_client` 表记录一致
- 全局加密开关：`VITE_GLOB_ENABLE_ENCRYPT`

关键环境变量（`apps/web-antd/.env.development`）：

```properties
VITE_PORT=5666
VITE_APP_TITLE=QTP
VITE_GLOB_API_URL=/api
VITE_GLOB_ENABLE_ENCRYPT=true
VITE_GLOB_RSA_PUBLIC_KEY=
VITE_GLOB_RSA_PRIVATE_KEY=
VITE_GLOB_APP_CLIENT_ID=e5cd7e4891bf95d1d19206ce24a7b32e
```

### 常用脚本

| 命令 | 说明 |
| :--- | :--- |
| `pnpm dev:antd` | 启动 web-antd 开发服务 |
| `pnpm build:antd` | 生产构建 |
| `pnpm check:type` | TS 类型检查 |
| `pnpm lint` / `pnpm lint:fix` | 代码检查 / 自动修复 |
| `pnpm format` | 格式化 |
| `pnpm test:unit` | 单元测试（vitest） |

---

## Git 提交规范

遵循 Angular 提交规范（`feat` / `fix` / `style` / `perf` / `refactor` / `revert` / `test` / `docs` / `chore` / `wip` 等），可使用 `pnpm commit` 交互式提交。

---

## 致谢

- [vue-vben-admin v5](https://github.com/vbenjs/vue-vben-admin)
- [ruoyi-plus-vben5](https://gitee.com/dapppp/ruoyi-plus-vben5)（本项目所基于的前端基座）
- [RuoYi-Vue-Plus](https://gitee.com/dromara/RuoYi-Vue-Plus/tree/5.X/)
- [antdv-next](https://github.com/antdv-next/antdv-next)

## License

[MIT](./LICENSE)
