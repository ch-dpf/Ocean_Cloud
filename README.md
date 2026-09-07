# Ocean_Cloud · 云海平台

React + TypeScript + Vite 应用级前端，使用 npm workspaces 管理主平台、业务应用和公共包。

开发入门见 [主平台与子平台开发教程](docs/platform-development-guide.md)，完整资料见 [文档目录](docs/README.md)。Java 上传发布的接入契约见 [后端接入说明](docs/java-backend-integration.md)。

## 启动

要求 Node.js 22.12+、npm 10+。应用管理需要独立的 Ocean_Cloud_Control 服务，两个项目放在同级目录。

先在 Ocean_Cloud_Control 执行：

```shell
npm ci
npm start
```

再在 Ocean_Cloud 执行：

```shell
npm ci
npm run dev
```

主平台：http://localhost:5173。后台服务：http://localhost:5180，仅监听本机。
主平台 Vite 会把 /api 和 /apps/ 代理到内部后台；主平台、地理信息和海洋信息共用 http://localhost:5173，仅访问路径不同。单独启动主平台：`npm run dev -w @ocean-cloud/portal`。
后台缺失时显示连接错误，不使用静态应用列表冒充已发布状态。

## 应用管理

- 创建：填写名称、唯一标识、/apps/xxx 路由、图标、描述和启用/展示状态，后台生成独立工程及本地 Git 仓库。
- 开发：在应用详情中查看工程位置。原地理信息、海洋信息仍在本仓库 apps 下，新增工程位于后台数据目录 projects 下。
- 发布：复制当前源码快照，执行依赖安装、TypeScript 检查和 Vite 构建；保存产物后切换当前版本。
- 回滚：选择历史发布版本，切换入口映射。构建失败不替换当前版本。
- 删除：应用移入回收站，列表移除且原入口返回 404；保留源码、发布版本、任务记录及标识和路由。存在执行中的任务时不可删除。可在回收站恢复原配置和版本。
- 路由：卡片读取后台配置，在当前标签页进入独立站点。返回平台同样使用当前标签页。停用后直接访问也会被后台拒绝；隐藏只影响应用中心展示。
- 初次启动的地理信息和海洋信息处于待发布状态，需要在应用管理中分别发布。

发布产物通过统一入口 /apps/xxx/ 提供，平台注入当前入口路径和返回地址。资源使用相对路径，修改入口路由无需重建。子应用内部仍使用 Hash 路由，未知页面显示 404，缺失静态资源返回真实 404。

## 目录与检查

| 目录                        | 用途                                   |
| --------------------------- | -------------------------------------- |
| apps/portal                 | 应用管理、应用中心、动态入口           |
| apps/geographic-information | 地理信息业务工程                       |
| apps/marine-information     | 海洋信息业务工程                       |
| apps/resources              | 本地资源中心开发示例，不注册到应用中心 |
| packages/http               | Axios、错误分类和订阅事件              |
| packages/ui                 | 公共组件、路由和运行时配置             |
| packages/bridge             | 资源示例保留的通信契约                 |
| packages/theme              | 共享基础样式                           |

`npm run check` 执行格式、Lint、TypeScript 检查和全部前端构建。
`npm run build -w @ocean-cloud/geographic-information` 可独立构建指定应用。
业务采用页面 → 组件/Hook → Service → httpClient 分层，禁止跨应用导入业务源码。
仓库保留前端源码、配置、锁文件、必要资源与 docs 开发文档。测试、辅助脚本、日志、node_modules、构建产物和本地环境配置不上传。

## 配置与边界

主平台 VITE_API_BASE_URL 默认 /api；Vite 代理目标通过进程环境变量 OCEAN_CONTROL_TARGET 配置，默认 http://127.0.0.1:5180。
子应用独立开发时，VITE_PORTAL_ORIGIN 默认为 http://localhost:5173，VITE_API_BASE_URL 默认为 /api。
VITE_* 为构建时配置，不能保存密钥。生产静态服务需配置管理接口代理与各应用站点路由。

目前为单机可信开发环境：已提供创建、发布、回滚和持久化配置；尚未实现统一认证/RBAC、远程 Git 拉取、容器隔离、远程服务器部署和多实例任务调度。
后台管理 API 与业务 API 不应混用；真实业务后端需要另行配置。不能将当前无登录的本地管理服务直接公开到网络。
详见同级 Ocean_Cloud_Control/README.md。

正式静态运行也可由后台统一托管主平台 apps/portal/dist 和所有子应用：先构建主平台，再把 PORTAL_ORIGIN 配置为实际统一入口并启动后台。此时所有页面、管理 API 和子应用都在同一个地址下。开发用的子应用独立端口不作为应用中心入口。
