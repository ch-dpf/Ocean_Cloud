# Ocean_Cloud · 云海平台

Ocean_Cloud 是基于 **React + TypeScript + Vite** 的应用级微前端平台。主应用提供工作台、统一导航和应用入口，业务子应用独立运行、构建和部署。

当前版本为 `0.1.0`，默认分支为 `master`，使用 npm workspaces 管理代码。

## 项目能力

- **平台主应用**：工作台、应用中心、统一布局和应用注册。
- **资源中心子应用**：通过 Axios 加载示例资源，支持类型筛选、搜索和元数据详情。
- **微前端通信**：iframe 容器隔离、来源与载荷校验、就绪握手、平台上下文、返回导航、加载超时与重试。
- **统一请求层**：Axios 封装、动态 Token 注入入口、超时与取消、HTTP 状态码及业务错误码订阅。
- **异常处理**：主子应用无效路由的 404 页面，以及可关闭的请求错误提示。
- **工程规范**：TypeScript strict、CSS Modules、组件职责分层、Prettier、Oxlint 和项目约定检查。

> 当前为前端基础工程。资源来自示例 JSON，尚未接入真实业务后端、登录、权限和文件上传下载。海洋可视化、智能处理为“规划中”的展示项。

## 环境要求

- Node.js **22.12 或以上版本**；当前工程已在 Node.js 22.22.1 下验证。
- npm **10 或以上版本**。
- 能访问远程仓库的内网环境，以及可用的 npm 依赖源。

项目名称及目录名为 `Ocean_Cloud`，npm 包名按规范使用小写 `ocean-cloud`。依赖版本由 `package-lock.json` 锁定。

## 获取与启动

```powershell
git clone --branch master http://192.168.14.58:3000/Ocean/Ocean_Cloud.git
cd Ocean_Cloud
npm ci
npm run dev
```

| 应用             | 访问地址                                                                         |
| ---------------- | -------------------------------------------------------------------------------- |
| 平台主应用       | [http://localhost:5173](http://localhost:5173)                                   |
| 资源中心独立入口 | [http://localhost:5174](http://localhost:5174)                                   |
| 平台内资源中心   | [http://localhost:5173/#/apps/resources](http://localhost:5173/#/apps/resources) |

两个应用均启用固定端口检查。端口被占用时启动失败，不会自动切换到其他端口。默认来源使用 `localhost`；更换为局域网地址或 `127.0.0.1` 时，需要同步修改主子应用配置。

## 常用命令

在项目根目录执行：

| 命令                        | 用途                                       |
| --------------------------- | ------------------------------------------ |
| `npm ci`                    | 按锁文件安装依赖                           |
| `npm run dev`               | 同时启动主应用和资源中心                   |
| `npm run build`             | 严格类型检查并分别构建两个应用             |
| `npm run preview`           | 同时预览两个应用的构建产物                 |
| `npm run format`            | 格式化源码与文档                           |
| `npm run format:check`      | 检查格式                                   |
| `npm run check:conventions` | 检查组件目录、文件长度、请求边界和样式引用 |
| `npm run lint`              | 检查 apps 与 packages，警告视为失败        |
| `npm test`                  | 运行通信契约与本地 HTTP 集成测试           |
| `npm run check`             | 执行全部工程检查、测试和构建               |

`preview` 使用与开发服务相同的 5173 / 5174 端口，需先停止 `dev`，并执行 `npm run build`。

单独运行或构建应用：

```powershell
npm run dev -w @ocean-cloud/portal
npm run dev -w @ocean-cloud/resources
npm run build -w @ocean-cloud/portal
npm run build -w @ocean-cloud/resources
```

## 目录结构

```text
Ocean_Cloud/
├─ apps/
│  ├─ portal/                  平台主应用
│  │  └─ src/
│  │     ├─ config/            应用注册与导航配置
│  │     ├─ features/          应用卡片、工作台、微前端容器
│  │     ├─ layouts/           平台布局、侧栏和顶部栏
│  │     ├─ pages/             工作台、应用中心、关于与 404
│  │     ├─ routes/            主应用路由表
│  │     ├─ services/          主应用 HTTP 客户端
│  │     └─ types/             应用契约类型
│  └─ resources/               资源中心子应用
│     ├─ public/mock/          示例资源 JSON
│     └─ src/
│        ├─ features/resources/  组件、Hook、Service、类型与常量
│        ├─ hooks/            平台通信 Hook
│        ├─ pages/            资源页面
│        └─ services/         子应用 HTTP 客户端
├─ packages/
│  ├─ bridge/                  主子应用消息契约与运行时校验
│  ├─ http/                    共享 Axios 请求封装
│  ├─ theme/                   基础主题样式
│  └─ ui/                      公共 UI 与浏览器 Hook
├─ scripts/                    工程约定检查
├─ tests/                      通信与 HTTP 测试
├─ docs/                       架构、开发规范和接口说明
├─ AGENTS.md                   仓库协作约定
└─ package.json                工作空间与统一命令
```

## 环境配置

默认配置可以直接启动示例。需要覆盖配置时，在对应应用目录创建 `.env.local`：

```powershell
Copy-Item apps/portal/.env.example apps/portal/.env.local
Copy-Item apps/resources/.env.example apps/resources/.env.local
```

| 应用      | 变量                 | 默认值                   | 用途                 |
| --------- | -------------------- | ------------------------ | -------------------- |
| portal    | `VITE_RESOURCES_URL` | `http://localhost:5174/` | 资源子应用入口       |
| portal    | `VITE_API_BASE_URL`  | `/api`                   | 主应用 API 基地址    |
| resources | `VITE_PORTAL_ORIGIN` | `http://localhost:5173`  | 允许通信的主应用来源 |
| resources | `VITE_API_BASE_URL`  | `/api`                   | 子应用 API 基地址    |
| resources | `VITE_USE_MOCK_DATA` | `true`                   | 是否加载示例资源     |

将 `VITE_USE_MOCK_DATA` 设置为 `false` 后，资源 Service 从 API 基地址下的 `/resources` 请求数据，当前契约为 `ResourceRecord[]`。后端实际结构不同，需要在 Service 中显式适配。

`/api` 需要由部署代理映射到真实服务，当前没有配置虚构的后端目标。Vite 环境变量在构建时注入，变量变更后需重启开发服务或重新构建；`VITE_*` 不得存放密钥。

## 架构与开发约定

采用 iframe 进行应用级集成，每个应用拥有独立的 React 根节点、运行环境和构建产物。主子应用通过 `postMessage` 交换约定消息，校验来源、发送窗口和载荷，不直接共享业务 DOM 或状态。

- 页面组合组件，Hook 管理状态与副作用，Service 定义业务请求。
- 所有请求经应用 `services/httpClient.ts`，不在组件内直接调用 Axios 或 fetch。
- 组件使用命名导出、同名目录、显式 Props 和就近 CSS Modules。
- 应用注册集中在 `apps/portal/src/config/applications.ts`。
- 接口 404 提示资源不存在，保留当前页面；无效路由显示 404 页面。
- 离开子应用会卸载 iframe，临时筛选状态随之清空；弹窗限于子应用视口。

具体说明：

- [架构、通信与部署](docs/architecture.md)
- [命名与组件开发规范](docs/development-standards.md)
- [Axios 请求与错误处理](docs/http-client.md)

## 构建与部署

```powershell
npm ci
npm run check
```

构建产物分别位于 `apps/portal/dist` 和 `apps/resources/dist`，可部署到两个独立静态站点。构建前配置生产入口地址及通信来源，部署服务器需允许平台嵌入子应用，并配置 SPA 回退。详细步骤见[部署说明](docs/architecture.md#生产构建与部署)。

Vite preview 用于检查产物，不作为生产服务器。

## 测试范围

`npm test` 验证主子应用消息契约，以及通过本地 HTTP 服务验证 Axios 请求参数、JSON 请求体、Token、HTTP 状态码分类、业务码、超时、网络失败、取消和订阅退订，不依赖真实业务后端。

当前已验证工作台、资源中心嵌入与独立访问、资源筛选及详情、无效路由 404 和返回首页。后续接入真实数据及认证流程时，需要补充对应的联调与验收。
