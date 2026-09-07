# Ocean_Cloud 开发规范

此文档是本项目的工程约定。所有新功能通过 `npm run check` 后再交付。

## 命名

| 对象              | 规则                       | 示例                                                |
| ----------------- | -------------------------- | --------------------------------------------------- |
| npm 包、业务目录  | kebab-case                 | @ocean-cloud/http、micro-applications               |
| React 组件、Props | PascalCase；组件放同名目录 | ResourceTable/ResourceTable.tsx、ResourceTableProps |
| 页面、布局        | Page / Layout 后缀         | ResourcesPage、PortalLayout                         |
| Hook              | use + PascalCase           | useResources.ts                                     |
| 服务、配置、工具  | camelCase 文件名           | resourceService.ts、applications.ts                 |
| 常量              | UPPER_SNAKE_CASE           | MICRO_APPLICATIONS                                  |
| 普通变量、函数    | camelCase，语义完整        | selectedResource、normalizeRequestError             |
| 布尔量            | is / has / can 前缀        | isEmbedded、isLoading                               |
| 组件回调 Props    | on + 动词                  | onSelectResource、onQueryChange                     |
| 本地事件处理器    | handle + 事件              | handleMessage                                       |
| CSS Modules       | 同组件名，类名 camelCase   | ResourceTable.module.css、tableFooter               |

React 组件统一使用命名导出；App.tsx 和 main.tsx 为入口例外，不强制放同名目录。routes 中的 JSX 路由表不是组件，使用 camelCase 文件名。
类型不加 I/T 人工前缀；集合使用复数，避免 data、item、type 等含糊的领域字段。资源字段使用 kind、updatedAt、sizeLabel。

## 分层与依赖

- App：组合应用级布局、路由及通知，不承担业务详情。
- pages：组合业务组件，连接 Hooks 与交互；不直接发送 HTTP 请求。
- layouts：平台框架、侧栏、顶部栏。
- features/<业务>/components：领域 UI，每个组件一个文件夹，Props 显式声明为 readonly。
- features/<业务>/hooks：状态、副作用、加载和取消生命周期。
- features/<业务>/services：接口地址、请求参数及响应契约。
- config / types / constants：应用配置、独立类型及常量。
- packages/http：唯一 Axios 入口，不依赖 React、路由或 UI。
- packages/ui：已证明跨应用复用的 UI 与浏览器 Hook。
- packages/bridge：主子应用消息契约。
- packages/theme：基础样式；业务样式使用就近 CSS Modules。

依赖方向为页面 → 业务组件/Hook → 服务 → HTTP。禁止跨应用导入源码。统一应用注册表生成导航和卡片；不要重复硬编码可用应用清单。
组件不根据页面全局变量工作，不操作另一个组件的 DOM；只通过 Props、回调和约定消息通信。
仅抽取确实重复的结构；不为了分层创建无逻辑的转发 Service、空目录或万能工具类。

## 样式与格式

组件样式使用 CSS Modules，禁止全局 table、header 等业务选择器。主题文件保留 reset、排版和明确的 page-heading / eyebrow 基础工具类。
UTF-8、LF、两空格、单引号、不加分号，Prettier 负责格式化。组件源码超过 220 行需要拆分职责。TypeScript strict 已开启。

## 请求与错误

业务请求只经由应用 services/httpClient.ts，禁止直接导入 Axios 或调用 fetch。
异步请求处理 loading、error、empty，组件卸载使用 AbortController，取消不显示错误。
HTTP 错误不自动导航，尤其接口 404 不应把当前页面替换成 404 页面。路由未匹配由 NotFound 处理。
详见 [HTTP 请求与错误处理](http-client.md)。

## 自动检查

- npm run format / npm run format:check：格式化与验证。
- npm run check:conventions：组件目录、220 行上限、跨应用导入与请求边界。
- npm run lint：覆盖 apps 和 packages，警告视为失败。
- npm test：仅运行本地保留的通信协议及 HTTP 测试，测试文件不随仓库分发。
- npm run build：strict 类型检查与独立构建。
- npm run check：依次运行格式、工程约定、Lint 检查和构建，不依赖本地测试文件。

命名语义、职责划分和 CSS 类名仍需代码审查；自动检查并不等同于完整架构审查。
