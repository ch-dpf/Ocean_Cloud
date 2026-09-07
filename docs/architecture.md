# 架构与部署

## 职责边界

浏览器 → portal（导航和应用注册）→ iframe → resources（自身 React 根节点和业务状态）。
两个应用分别使用自己的 React 运行时和 dist，通过 postMessage 通信，不能直接导入对方的业务源码。
共享 theme 是构建期样式，不是运行期全局样式。bridge 仅包含契约及校验。

主应用使用 Hash 路由，刷新 /#/apps/resources 无需服务器配置路径回退。资源中心当前为单页；新增子应用内部路由应由子应用自己管理。

## 消息协议

通道固定为 ocean-cloud:v1，所有消息先校验 origin、source 和运行时载荷。

| 方向    | type     | 载荷                                | 用途             |
| ------- | -------- | ----------------------------------- | ---------------- |
| 子 → 主 | ready    | appId: resources                    | 子应用挂载就绪   |
| 主 → 子 | context  | theme: light, platform: Ocean_Cloud | 初始化平台上下文 |
| 子 → 主 | navigate | path: /                             | 返回主应用工作台 |

主应用 12 秒内未收到 ready 则显示连接失败，重试会重新创建 iframe。
当前上下文只传平台名称和主题，未实现身份令牌传递。新增协议需同步类型、运行时验证和测试，不使用通配 targetOrigin。
iframe sandbox 仅允许 scripts 和 same-origin；生产上主子应用应采用不同来源，避免同源内容弱化隔离。

## 新增子应用

1. 在 apps 下用 react-ts 模板建立应用，分配唯一包名、固定端口并启用 strictPort。
2. 添加 @ocean-cloud/bridge 依赖，接入 ready/context 握手，子应用单独打开时不发送父窗口消息。
3. 在 portal/src/config/applications.ts 注册 id、名称、路由和环境变量入口。路由根据注册项匹配并交由通用 MicroApplicationFrame 容器挂载；同步更新导航与应用卡片。
4. 扩展 bridge 的 appId 联合及对应校验，并增加应用卡片。
5. 将子应用加入根 dev / preview 启动命令，运行 build、lint 和 test，并验证独立访问与嵌入访问。

## 生产构建与部署

示例分别使用 https://cloud.example.com 和 https://resources.example.com 的站点根目录：

- 构建前在 apps/portal/.env.production 配置 VITE_RESOURCES_URL=https://resources.example.com/
- 在 apps/resources/.env.production 配置 VITE_PORTAL_ORIGIN=https://cloud.example.com
- 执行 npm ci、npm run build。
- 分别把 apps/portal/dist 和 apps/resources/dist 发布到对应静态站点根目录。
- 子应用服务设置 Content-Security-Policy: frame-ancestors https://cloud.example.com。
- 主应用 CSP 的 frame-src 需允许 https://resources.example.com。
- 子应用不能设置阻止平台嵌入的 X-Frame-Options: DENY 或 SAMEORIGIN。
- Vite 环境变量在构建时注入；地址变更需要重新构建。VITE_* 不得保存密钥。
- 当前 Vite base 为根目录；部署子目录时必须同步调整 base、入口地址和主应用 Logo 资源地址。

开发默认来源严格使用 localhost，127.0.0.1 或局域网地址需要同步修改两端环境变量并重启服务。
Vite preview 仅用于验证产物，不作为生产服务器。

## 验收

自动检查：npm run build、npm run lint、npm test。
浏览器检查：工作台进入资源中心 → 显示 Ocean_Cloud 上下文 → 筛选/搜索 → 详情与关闭 → 返回工作台；直接打开 5174 显示独立运行。
故障检查：停止资源子应用后重新进入，12 秒后应显示失败，恢复服务并重新连接。
