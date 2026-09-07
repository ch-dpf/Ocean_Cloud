# Ocean_Cloud · 云海平台

基于 React + TypeScript + Vite 的应用级微前端项目，使用 npm workspaces 管理主应用和独立业务子应用。

## 启动

要求 Node.js 22.12+、npm 10+。

```shell
git clone --branch master http://192.168.14.58:3000/Ocean/Ocean_Cloud.git
cd Ocean_Cloud
npm ci
npm run dev
```

- 平台入口：[http://localhost:5173](http://localhost:5173)
- 资源中心独立入口：[http://localhost:5174](http://localhost:5174)
- 应用中心和工作台的应用卡片在新标签页打开子系统；平台内资源导航保留嵌入入口。

## 目录

```text
apps/portal/       平台工作台、应用注册、导航和微前端容器
apps/resources/    资源中心子应用及运行所需的示例数据
packages/bridge/   主子应用消息契约与校验
packages/http/     Axios 请求封装及错误事件
packages/theme/    基础主题样式
packages/ui/       公共组件与浏览器 Hook
```

## 常用命令

| 命令              | 用途                       |
| ----------------- | -------------------------- |
| `npm run dev`     | 同时启动主子应用           |
| `npm run build`   | 类型检查并分别构建主子应用 |
| `npm run preview` | 预览构建产物，先停止 dev   |
| `npm run lint`    | 检查前端代码               |
| `npm run format`  | 格式化源码                 |
| `npm run check`   | 格式、Lint、类型检查及构建 |

独立启动：`npm run dev -w @ocean-cloud/portal` 或 `npm run dev -w @ocean-cloud/resources`。

## 配置与部署

各应用的 `.env.example` 提供配置示例，复制为同目录的 `.env.local` 后修改：

| 应用               | 变量                 | 默认值                   |
| ------------------ | -------------------- | ------------------------ |
| portal             | `VITE_RESOURCES_URL` | `http://localhost:5174/` |
| portal / resources | `VITE_API_BASE_URL`  | `/api`                   |
| resources          | `VITE_PORTAL_ORIGIN` | `http://localhost:5173`  |
| resources          | `VITE_USE_MOCK_DATA` | `true`                   |

资源中心默认通过 Axios 加载示例 JSON；设置 `VITE_USE_MOCK_DATA=false` 后请求 API 基地址下的 `/resources`，期望返回 `ResourceRecord[]`。实际后端协议不同，需要在业务 Service 中适配。

构建产物位于两个应用各自的 `dist/`，分别部署到静态站点根目录。生产构建前配置应用地址、API 地址及通信来源，静态服务器需配置 SPA 回退；使用嵌入入口时，子应用需允许平台来源嵌入。Vite 环境变量在构建时注入，不能用于保存密钥。

## 开发约定

组件采用同名目录、命名导出、显式 Props 和 CSS Modules。页面负责组合，Hook 管理状态，Service 调用统一 Axios 封装。应用之间不直接导入业务实现。

当前为前端基础工程，尚未接入真实业务后端、登录和权限；海洋可视化与智能处理为规划项。仓库保留前端源码、资源、构建配置、依赖锁文件及本说明；测试、详细文档和本地辅助文件不随仓库分发。
