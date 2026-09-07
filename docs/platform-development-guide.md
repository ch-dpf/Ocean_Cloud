# 云海平台主平台与子平台开发教程

更新日期：2026-09-07。适用项目：Ocean_Cloud 与同级 Ocean_Cloud_Control。

本文按当前代码记录从启动环境、开发业务到发布验证的完整流程。命令使用 Windows PowerShell；启动示例中的相对路径从包含 Ocean_Cloud 与 Ocean_Cloud_Control 的父目录执行，每个终端分别进入对应工程。示例中的新业务页面、业务 API 和代理配置需要开发者实际创建或接入，不表示系统已经具备该业务。

## 1. 先明确主平台与子平台的分工

主平台负责应用目录、工作台、应用管理、入口路由、发布版本和回收站。子平台负责自己的业务布局、菜单、页面、内部路由、数据与接口调用。

| 开发任务                                   | 应放位置                                                             |
| ------------------------------------------ | -------------------------------------------------------------------- |
| 应用中心、应用登记、版本发布、回收站       | `Ocean_Cloud/apps/portal`                                            |
| 地图浏览、图层管理、空间查询               | `Ocean_Cloud/apps/geographic-information`                            |
| 海洋观测、专题展示、海洋信息查询           | `Ocean_Cloud/apps/marine-information`                                |
| 确实被多个应用复用的组件或请求基础能力     | `Ocean_Cloud/packages`                                               |
| 工程生成、构建任务、发布存储、动态静态入口 | `Ocean_Cloud_Control/src`                                            |
| 平台新建的独立子应用业务                   | 应用详情中的工程目录，默认 `Ocean_Cloud_Control/var/projects/应用ID` |

当前前端使用 React、TypeScript、Vite 和 npm workspaces。两个内置子平台与主平台在同一个仓库中，可以分别构建，但依赖同仓公共包；不要仅复制一个 apps 子目录就当作完整独立工程。

主平台创建的新应用是另一类：后台按模板生成带自身依赖和公共包副本的工程，并初始化本地 Git 仓库。它不自动加入主平台根目录的 dev/build 命令，也不自动同步主平台公共包的后续修改。

主平台与子平台通过应用配置、同源 URL 和后端接口协作。当前正式入口不通过 iframe 挂载，不在新窗口打开，也不共享同一棵 React 组件树。

## 2. 工程目录与前置条件

```text
云海平台/
├── Ocean_Cloud/
│   ├── apps/
│   │   ├── portal/                   # 主平台
│   │   ├── geographic-information/   # 地理信息
│   │   ├── marine-information/       # 海洋信息
│   │   └── resources/                # 保留的开发示例，未登记到应用中心
│   ├── packages/
│   │   ├── http/                     # Axios 与错误事件
│   │   ├── ui/                       # 通用组件、路由 Hook、运行配置
│   │   ├── bridge/                   # 保留的通信契约
│   │   └── theme/                    # 基础主题
│   ├── docs/
│   └── package.json
└── Ocean_Cloud_Control/
    ├── src/                          # 当前 Node 控制服务
    ├── templates/react-ts-vite/      # 独立子应用生成模板
    └── var/                          # 本地运行数据，不提交
        ├── projects/
        ├── builds/
        ├── generation/
        ├── releases/
        └── database.json
```

环境要求以项目声明为准：Node.js 22.12+、npm 10+、Git。先确认工具可用：

```powershell
node --version
npm --version
git --version
```

`npm ci` 用于首次安装或依据锁文件重装依赖；日常启动不必每次执行。业务开发不手工修改 `node_modules` 或构建产物。

## 3. 从零启动当前平台

### 3.1 终端一：启动应用管理服务

```powershell
Set-Location '.\Ocean_Cloud_Control'
npm ci
npm run check
npm start
```

默认监听 `127.0.0.1:5180`。该终端用于持续运行服务，停止时使用 Ctrl+C。如果已有进程使用同一数据目录，不要重复启动另一份服务。

### 3.2 终端二：启动主平台

```powershell
Set-Location '.\Ocean_Cloud'
npm ci
npm run dev -w @ocean-cloud/portal
```

打开 [主平台](http://localhost:5173/)、[应用中心](http://localhost:5173/#/applications) 或 [应用管理](http://localhost:5173/#/application-management)。Vite 把 `/api` 和 `/apps` 转发给内部控制服务。

全量前端启动也可在根目录执行 `npm run dev`；它同时启动主平台、两个子平台及 resources 示例。与上面的单独启动方式二选一，避免重复占用端口。

### 3.3 根据开发对象选择地址

| 对象           | 单独启动命令，在 Ocean_Cloud 根目录执行              | 调试地址                 |
| -------------- | ---------------------------------------------------- | ------------------------ |
| 主平台         | `npm run dev -w @ocean-cloud/portal`                 | `http://localhost:5173/` |
| 地理信息       | `npm run dev -w @ocean-cloud/geographic-information` | `http://localhost:5175/` |
| 海洋信息       | `npm run dev -w @ocean-cloud/marine-information`     | `http://localhost:5176/` |
| resources 示例 | `npm run dev -w @ocean-cloud/resources`              | `http://localhost:5174/` |

子平台的独立端口用于开发热更新，不是应用中心的访问入口。应用中心访问的是控制服务保存的发布版本，例如 `http://localhost:5173/apps/geographic-information/`。

**保存源码会更新独立调试页面；已发布入口需要重新执行“构建并发布”才更新。** 当前没有把子平台热更新服务器自动接到统一 `/apps/` 路由的机制。

新数据目录首次启动时，内置应用可能尚未发布。在应用管理中完成首次发布后，才能从应用中心进入。已有数据目录沿用原发布状态。

## 4. 主平台开发流程

### 4.1 了解当前入口链路

`src/App.tsx` 组合应用注册上下文与 `PortalContent`；`PortalContent` 读取 Hash 路由、应用列表和页面信息，通过 `PortalLayout` 展示导航与内容。

需要经常使用的文件：

| 文件或目录，均相对 apps/portal | 用途                             |
| ------------------------------ | -------------------------------- |
| `src/routes/portalRoutes.tsx`  | 静态平台页面及动态应用入口解析   |
| `src/config/navigation.ts`     | 左侧平台导航                     |
| `src/pages`                    | 页面组合和交互入口               |
| `src/features/applications`    | 应用目录、创建、发布、删除等业务 |
| `src/layouts/PortalLayout`     | 平台框架、顶部栏和侧栏           |
| `src/services/httpClient.ts`   | 应用级 HTTP 实例                 |
| `src/types/application.ts`     | 当前应用管理数据契约             |

主平台页面当前包括工作台、应用中心、应用管理、应用回收站和关于平台。未知路由交给 NotFound，不在请求出错时强行改变页面路由。

### 4.2 新增一个平台业务页面

以拟新增的“操作记录”页面为例：

1. 在 `src/pages/OperationRecordsPage/` 创建命名导出的 `OperationRecordsPage.tsx`，样式放同目录 `OperationRecordsPage.module.css`。
2. 页面下的查询表单、记录表格等放入 `src/features/operation-records/components`；请求与类型放该业务的 `services`、`types`。
3. 在 `src/routes/portalRoutes.tsx` 导入页面，并在 `STATIC_ROUTES` 中新增路由项，例如 `'/operation-records': { title: '操作记录', element: <OperationRecordsPage /> }`。
4. 如果需要常驻侧栏入口，在 `src/config/navigation.ts` 增加对应的 path、label 和 icon；只需从某个页面进入的功能不强制增加全局导航。
5. 页面通过 Hook/Service 获取数据，处理加载、空数据、失败、重试与取消，不在 JSX 中直接发请求。
6. 启动主平台，访问 `/#/operation-records`，检查入口、面包屑、操作结果和未知路由行为。

上述页面与接口是开发示例，需要实际实现后再登记，不要添加指向不存在页面的导航。

### 4.3 修改应用管理功能

应用列表由 `ApplicationRegistryProvider` 请求接口，再经 `useApplications()` 供主平台使用。不要另外创建硬编码应用数组，否则应用中心与管理页会出现不同步。

请求集中在 `src/features/applications/services/applicationService.ts`。应用详情通过 `useApplicationDetail` 定期读取状态；更改任务或发布接口时，同时检查列表刷新、详情任务状态和错误处理。

改动管理契约要同步前端类型、服务端校验、响应和调用方。当前接口成功直接返回对象/数组；若 Java 后端使用业务 envelope，必须明确修改 Service 的解包逻辑，不能仅修改 TypeScript 类型。

## 5. 内置子平台开发流程

### 5.1 在对应应用内建设完整业务

地理信息入口是 `apps/geographic-information/src/App.tsx`，首页是 `src/pages/GeographicInformationPage/GeographicInformationPage.tsx`。海洋信息采用相同结构。

当前两个子平台的首页仍是基础入口，尚未实现具体业务模块。开发正式业务时，应将首页替换为业务工作台或首个业务页面，并按需要建立自己的布局与菜单；不要把初始化阶段、技术栈或待开发说明当成正式业务内容。

以地理信息图层管理为例，建议形成以下业务结构；尚不存在的目录按实际需要创建：

```text
src/
├── App.tsx
├── layouts/
│   └── GeographicLayout/
│       ├── GeographicLayout.tsx
│       └── GeographicLayout.module.css
├── pages/
│   └── LayerManagementPage/
│       ├── LayerManagementPage.tsx
│       └── LayerManagementPage.module.css
├── features/
│   └── layers/
│       ├── components/LayerTable/
│       ├── hooks/useLayers.ts
│       ├── services/layerService.ts
│       └── types/layer.ts
├── routes/
│   └── geographicRoutes.tsx
└── services/httpClient.ts
```

页面负责组合功能，业务组件通过 Props 接收数据与回调，Hook 管理请求状态和生命周期，Service 对接接口。只有存在重复且稳定的职责时才抽到公共包，不创建没有用途的空层级。

### 5.2 新增子平台内部路由

当前子平台在 `App.tsx` 里只处理 `/`，其他路由进入 404。新增页面时，可以将匹配逻辑提取到本应用 `routes` 目录，登记 `/map`、`/layers` 等内部路径，并保持未知路由回到 NotFound。

| 场景                   | 地址示例                                                     |
| ---------------------- | ------------------------------------------------------------ |
| 独立开发图层页         | `http://localhost:5175/#/layers`                             |
| 发布后的图层页         | `http://localhost:5173/apps/geographic-information/#/layers` |
| 主平台登记的子应用入口 | `/apps/geographic-information`                               |

主平台只登记子应用入口，不需要登记每一个内部页面。子平台新增“图层管理”不需要给主平台添加同名菜单。

保留 `useHashRoute()`、`RequestErrorNotice` 和运行配置接入。页面布局统一提供返回平台入口，避免新增页面遗漏返回入口或重复渲染两套顶部栏。

### 5.3 平台运行配置与返回

控制服务返回子应用入口 HTML 时，会注入 ID 为 `ocean-application-config` 的 JSON 节点，包含：

- `basePath`：当前应用的 `/apps/配置路由/`。
- `portalUrl`：`/#/applications`，在当前标签页返回应用中心。
- `name`：应用配置名称。

`getApplicationRuntime()` 读取该配置。不要把某个 IP、端口或固定应用路由写死到业务组件里。当前内置应用可沿用 `usePlatformBridge` 返回的 `portalUrl`；普通子应用完整页面导航不需要新增 iframe 握手。

生成应用支持通过运行配置读取当前名称；内置子应用首页目前使用自己的名称属性。如果需要在应用管理修改名称后同步显示到内置首页，应在该首页明确读取 `getApplicationRuntime().name`，不能假定所有组件已自动同步。

## 6. 新建一个独立子平台

### 6.1 通过应用管理生成工程

1. 打开应用管理，选择创建应用。
2. 填写名称、应用标识、入口路由、描述、图标、启用状态及展示状态。
3. 等待生成任务完成，在任务记录中确认结果。
4. 展开应用详情的工程位置，使用该目录开发。

应用标识必须唯一，采用小写字母、数字和短横线；路由格式为 `/apps/单段标识`，不能与其他应用或回收站记录重复。标识创建后不可修改，路由可配置，路由最后一段不必与标识相同。

以下假设已经创建标识为 `ocean-observation` 的应用，并且控制服务采用默认数据目录：

```powershell
Set-Location '.\Ocean_Cloud_Control\var\projects\ocean-observation'
npm ci
npm run dev
```

新建工程默认调试端口为 5190。多个生成应用同时开发时，为不同应用分配不同端口，例如在另一个工程中执行 `npm run dev -- --port 5191`。

### 6.2 工程与团队协作

生成工程可以独立维护源码与 Git 历史。平台当前只初始化本地仓库，不自动创建远程仓库、不推送代码，也不在发布时拉取远程分支。

当前“构建并发布”只读取后台记录对应的工程目录。因此团队在其他位置开发时，需要将确定的代码版本同步到该工程目录；上传 ZIP 的 Java 接入完成后，才可走远端开发、构建、上传发布的流程。

`var/projects` 中的源码虽然位于控制服务数据目录，但它是开发工作成果，应纳入独立源码管理和备份，不能按缓存清理。模板升级不会覆盖已生成工程；需要逐个应用审查和升级依赖及公共包副本。

## 7. 接口开发与联调

### 7.1 统一使用应用级 HTTP 实例

各应用通过自己的 `src/services/httpClient.ts` 创建 `@ocean-cloud/http` 实例。业务请求都经由本应用 Service，组件不直接导入 Axios，也不使用 fetch 绕过错误处理。

以下为拟新增 `src/features/layers/services/layerService.ts` 的例子；`Layer` 类型与 `/api/geographic/layers` 接口需由业务前后端约定并实现：

```typescript
import { httpClient } from '../../../services/httpClient'
import type { Layer } from '../types/layer'

export function listLayers(signal?: AbortSignal) {
  return httpClient.get<Layer[]>('/geographic/layers', { signal })
}
```

默认 baseURL 为 `/api`，因此请求地址为 `/api/geographic/layers`。不要再次在 Service 中拼接 `/api`，以免得到 `/api/api/...`。

TypeScript 泛型不验证后端真实数据；字段不确定时在 Service 边界校验响应。失败应保留 Promise rejection，由 Hook 或页面更新错误状态，不能 catch 后无条件返回空列表伪装成功。

页面卸载或查询条件改变时取消不再需要的请求。加载失败、业务空数据和用户主动取消是不同状态；避免迟到的旧请求覆盖新结果。

### 7.2 为独立子平台配置业务 API 代理

当前地理信息、海洋信息的 Vite 配置未提供业务 `/api` 代理。真实接口联调需要补齐。以下是地理信息配置示例，默认业务后端 8080 仅为待接入目标，使用前确认服务和接口已存在：

```typescript
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const businessTarget =
  process.env.OCEAN_BUSINESS_TARGET || 'http://127.0.0.1:8080'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api/geographic': { target: businessTarget, changeOrigin: true },
    },
  },
  preview: { port: 5175, strictPort: true },
})
```

该配置不重写请求路径，后端应接收完整 `/api/geographic/...`。海洋信息相应使用自己的端口和业务 API 前缀。`server.proxy` 用于开发服务；产物预览如需 API 代理还要配置 `preview.proxy`，生产访问通过部署网关完成。[Vite 代理配置](https://vite.dev/config/server-options.html#server-proxy)

从主平台的已发布入口联调时，业务 API 请求会发送到主平台统一地址。当前控制服务只实现应用管理 API，不会自动转发图层、海洋观测等业务请求。需要在主平台 Vite 或部署网关中，将具体业务前缀转发到对应后端，同时保留 `/api/applications` 等控制接口和 `/apps/` 静态入口的原目标。

多个代理规则应把更具体的业务前缀放在通用 `/api` 规则之前。不要为接入一个业务接口直接把所有 `/api` 都改到业务服务，导致应用管理不可用。

### 7.3 错误、认证与数据协议

现有 HTTP 层提供 `onError`、`onStatus` 和 `onBusinessCode`，页面通过 `RequestErrorNotice` 展示必要的请求反馈。接口 404 不导航到整页 404；401/403 等事件需要按真实认证体系处理，不预设虚构登录页或用户身份。

当前非 2xx 错误使用 HTTP 分类的预设提示，不自动提取后端响应中的 `message/code`。如果需要精确业务原因，应按 [Java 后端接入说明](java-backend-integration.md) 中的契约完善封装。不要把 HTTP 错误包装成 200 成功响应。

接口、Token 和业务码接入细节参见 [HTTP 请求与错误处理](http-client.md)。

## 8. 配置与环境变量

| 配置                    | 当前读取位置或生效方式                                                |
| ----------------------- | --------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | 各应用的 HTTP 实例，默认 `/api`；Vite 启动/构建时读取                 |
| `VITE_PORTAL_ORIGIN`    | 当前内置子应用的独立开发返回地址，默认 `http://localhost:5173`        |
| `OCEAN_CONTROL_TARGET`  | 主平台 Vite 配置通过 `process.env` 读取，默认 `http://127.0.0.1:5180` |
| `OCEAN_BUSINESS_TARGET` | 本教程代理示例使用的进程变量；只有加入示例配置后才生效                |
| `CONTROL_PORT`          | 控制服务监听端口，默认 5180                                           |
| `CONTROL_DATA_DIR`      | 控制服务数据目录，默认服务工程的 `var`                                |
| `OCEAN_FRONTEND_DIR`    | 控制服务使用的前端工程路径，默认同级 Ocean_Cloud                      |
| `PORTAL_ORIGIN`         | 控制服务认可的主平台来源，默认 `http://localhost:5173`                |

控制服务当前不会自动加载 `.env`，其 `.env.example` 仅说明变量。需要在启动该服务的 PowerShell 中设置 `$env:变量名 = '值'`，再启动进程。不要为了修改开发配置去编辑发布数据 JSON。

各前端应用可使用自身目录内的 `.env.local` 保存本地 `VITE_*` 配置，修改后重启相应 Vite 进程。`OCEAN_CONTROL_TARGET` 当前直接读取进程变量，不能仅写进 `.env.local` 就假定被这段配置代码读取。

Vite 的 `VITE_*` 会进入浏览器构建产物，不能存放密钥；它们是构建配置，修改后不能自动改变已经发布的文件。[Vite 环境变量说明](https://vite.dev/guide/env-and-mode.html)

当前控制服务创建源码快照时排除除 `.env.example` 外的 `.env*` 文件。因此本地 `.env.local` 不会自动带入平台构建。发布优先使用同源 `/api` 与运行配置；确需环境差异时，应在发布执行器中明确设计配置注入，不依靠复制本地私有环境文件。

## 9. 构建、发布、回滚与删除

### 9.1 本地检查与构建

在 Ocean_Cloud 根目录执行：

```powershell
npm run check
```

当前命令实际执行：Prettier 检查、Oxlint 检查、所有工作区 TypeScript 检查和 Vite 构建。不包含测试，也不包含独立生成在控制服务目录中的子应用。

单独构建主平台或内置子平台：

```powershell
npm run build -w @ocean-cloud/portal
npm run build -w @ocean-cloud/geographic-information
npm run build -w @ocean-cloud/marine-information
```

产物分别位于对应应用的 `dist`。生成的独立子应用在自身目录执行 `npm run build`，产物为自身的 `dist`。

如果本地 `scripts/checkConventions.mjs` 存在，可额外执行 `node scripts/checkConventions.mjs` 检查命名、组件长度和请求边界。当前根 package.json 不提供 `npm test` 或 `npm run check:conventions`，不要照旧文档运行不存在的脚本。

### 9.2 当前源码发布方式

1. 完成开发与检查，确认控制服务读取的工程目录是本次准备发布的代码。
2. 在主平台应用管理中选择应用，点击“构建并发布”。
3. 后台创建源码快照，记录 Git HEAD 和源码摘要，安装锁定依赖、执行 TypeScript 与 Vite 构建。
4. 构建成功后保存独立产物，并更新当前版本；失败保留原发布版本。
5. 从应用中心进入，验证当前版本和真实业务行为。

后台发布使用工作目录当前内容，包含未提交修改；Git HEAD 只代表提交基线，实际输入以源码摘要和任务记录为准。当前不会自动拉取远程仓库，也不等同于提交 Git 就自动上线。

当前后台对内置工作区发布时会复制整个前端仓库快照，再构建目标应用，因此会包含目标依赖的公共包。不要在发布过程中同时修改相关工作目录，以免源码快照包含不一致的编辑状态。

### 9.3 子路径资源与 ZIP 交付

后台发布显式执行 Vite `--base=./`。独立生成模板本身也配置 `base: './'`；当前两个内置应用的默认 Vite 配置未显式设置 base，直接运行默认 build 得到的包不能不经检查就用于任意子路径部署。

如果需要手工准备 ZIP，应先在目标子应用配置中设置 `base: './'`，再构建，检查 HTML、图片、字体、动态导入和 Worker 的引用都适合 `/apps/配置路由/`。手写的 `/assets/...` 等绝对地址也需要修正。[Vite 相对基础路径](https://vite.dev/guide/build.html#relative-base)

ZIP 根目录应直接包含 `index.html` 和 `assets` 等产物，不带源码、依赖目录或外层 `dist`。当前前端尚无 ZIP 上传入口，Java 上传、版本启用与部署流程见 [Java 后端接入说明](java-backend-integration.md)。该文档记录待实现契约，不能当作已经可调用的接口。

### 9.4 回滚、删除与恢复

应用管理可以切换到已保存的历史版本。回滚改变应用当前版本，不回退工程源码或 Git 工作区；回滚后如需继续开发，应自行确认源码基线。

删除把应用移入回收站，原入口返回 404，源码、发布版本和任务记录保留；ID 与路由仍被保留。回收站恢复沿用原启用/展示设置和当前版本。同应用有排队或执行中任务时禁止删除。

隐藏只影响应用中心展示；停用会使直接访问返回 403。尚未发布返回 503。不要把隐藏开关当成访问权限控制。

## 10. 主平台与公共包如何交付更新

主平台本身不是应用中心里的普通业务应用。修改主平台后，本地 Vite 热更新；部署时构建 `apps/portal/dist` 并更新主平台静态目录，不通过某个子应用的“构建并发布”按钮发布主平台。

更新 `packages/ui`、`packages/http`、`packages/theme` 等公共内容后，内置工作区需要构建和验证受影响应用；已发布子应用不会随源码改动自动升级，需要分别重新发布。

已生成的独立子应用内含公共包副本，不会自动使用同级 Ocean_Cloud 的修改。它们应按独立项目升级、验证和发布，不跨目录直接引用主平台未发布源码。

当前 Node 控制服务可同时提供主平台 `apps/portal/dist`、管理 API 和已发布子应用，默认仍只绑定本机。正式统一入口与 Java 接入参见 [架构与部署](architecture.md) 和 [后端接入说明](java-backend-integration.md)。配置、发布数据与主平台静态文件应分别管理，更新前端不清空应用版本。

## 11. 开发规范与验证清单

命名组件与目录使用 PascalCase，页面以 Page 结尾，Props 显式声明且字段 readonly，Hook 使用 use 前缀，Service 使用清晰的业务名称。业务样式采用就近 CSS Modules，避免全局修改 table、header 等标签。

页面按正式业务设计，不显示开发环境、脚手架、技术栈或工程初始化进度说明。技术条件写进 docs；页面保留准确的业务状态、必要字段说明和操作失败反馈。不要伪造登录用户、权限、统计或已接入数据。

中文文件使用 UTF-8，格式由 Prettier 统一。详见 [开发规范](development-standards.md)。

每次功能交付按实际改动验证：

- 主平台：导航、页面、加载/空数据/错误状态、表单提交、刷新与浏览器后退。
- 子平台：独立调试、统一入口、内部路由刷新、返回平台，保持当前标签页及统一访问地址。
- 接口：参数、真实数据、失败状态、请求取消与权限校验；接口 404 不替换整个页面。
- 发布：构建成功、入口与资源可读、版本变化、失败保留旧版本、回滚及删除恢复。
- 公共包：检查受影响的应用，不能只验证主平台。

源码、配置、锁文件、必要资源和 docs 开发文档按仓库约定提交。测试、日志、运行数据、node_modules、dist、真实环境文件和本地辅助脚本不上传。只暂存与当前开发任务相关的文件。

### 11.1 代码管理与交接

主平台前端仓库地址为 `http://192.168.14.58:3000/Ocean/Ocean_Cloud.git`，约定默认分支为 master。控制服务与生成的独立工程是不同源码边界，不要将它们误提交到主平台前端仓库。远程仓库是否已包含某项功能，需要核对实际交付提交，不能仅按本地运行效果判断。

每次提交前在相应仓库检查改动：

```powershell
git status --short
git diff --stat
git diff -- apps/geographic-information
```

上述最后一条以地理信息为例，应替换为本次负责的目录。审阅实际差异后，按具体文件暂存、提交；不要把其他任务的修改一并提交。提交与推送只交付源码，发布应用仍需执行对应发布流程。

交接至少提供源码版本、启动命令、环境变量名称、接口约定、部署路径和验证结果；开发文档随源码版本一同交付。应用的原始包、发布记录和持久数据按后端存储方案管理。

## 12. 常见问题

| 现象                                 | 排查方式                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------- |
| 主平台显示无法连接应用管理服务       | 检查 5180 服务、Vite `/api` 代理和 OCEAN_CONTROL_TARGET；无需创建静态假应用列表       |
| 应用无法进入或显示未发布             | 在应用管理确认生成任务和首次发布；源码存在不代表已发布                                |
| 改完子平台代码，应用中心仍显示旧页面 | 当前入口使用发布产物；到独立调试端口查看热更新，或重新发布                            |
| 子平台调试 API 返回 404 或 HTML      | 检查该子应用 Vite 是否配置业务代理，以及请求是否被错误发送到只提供管理 API 的控制服务 |
| 独立调试正常，发布后 JS/CSS 404      | 检查 base、硬编码绝对资源、末尾斜杠和发布路径；不要把缺失资源回退为 HTML              |
| 子平台内部页面刷新 404               | 当前内部路由应位于 Hash 后；确认运行配置节点及 useHashRoute，History 方案需另行配置   |
| 配置改了仍不生效                     | 区分进程变量、Vite 构建变量和后端运行配置；按读取时机重启或重建                       |
| 本地 API 地址生效，平台发布后失效    | 发布快照排除了 .env.local；采用同源代理或明确的发布配置注入                           |
| 修改公共组件后部分应用未变化         | 区分已发布版本、同仓工作区和生成工程的副本；逐个更新受影响版本                        |
| 删除后无法重建同名应用               | ID 和路由仍由回收站记录占用，恢复原应用或选择其他标识                                 |
| 端口占用或控制服务数据目录已锁定     | 检查是否已启动相关服务，不重复启动或盲目删除锁文件                                    |
| 想在其他电脑开发后直接上传包         | 当前上传入口未实现；按 Java 接入说明完成后才能走 ZIP 发布流程                         |

继续阅读：[文档目录](README.md)、[架构与部署](architecture.md)、[HTTP 请求与错误处理](http-client.md)、[Java 后端接入说明](java-backend-integration.md)。
