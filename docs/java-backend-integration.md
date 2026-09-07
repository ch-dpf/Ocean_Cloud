# 云海平台 Java 后端接入说明

更新日期：2026-09-07。适用项目：Ocean_Cloud。

本文约定 Java 后端接收子应用发布包、管理应用及版本、提供统一访问路由的接入方式，供前端、后端和部署人员共同使用。

当前应用管理服务为同级目录 `Ocean_Cloud_Control` 中的 Node.js 实现。Java 服务、上传发布包接口及前端上传界面尚未实现。本文中的新增接口、Java 代码和部署配置是接入设计，不能视为已经交付的运行能力。

## 1. 接入目标与职责

业务流程：创建应用并配置路由 → 上传构建后的 ZIP → 校验应用包 → 发布版本 → 在应用中心进入应用。

| 模块           | 职责                                                             |
| -------------- | ---------------------------------------------------------------- |
| 主平台前端     | 维护应用信息、上传包、展示进度与任务结果、发布、回滚、删除和恢复 |
| Java 后端      | 校验权限和数据，接收文件，校验与保存版本，管理任务和访问路由     |
| 数据库         | 保存应用、版本、任务、当前版本指针和操作记录                     |
| 持久化文件目录 | 保存原始 ZIP、解压产物和必要的任务文件                           |
| Nginx          | 提供主平台静态页面，将 `/api/` 与 `/apps/` 转发到 Java           |

用户无需填写服务器磁盘目录。页面配置的“入口路由”是浏览器访问路径，应用包是该路径对应的实际内容，两者通过应用记录关联。

上传对象是 React 等前端工程构建出的 HTML、JavaScript、CSS 和静态资源。此流程不负责部署子应用的 Java JAR、业务数据库或其他后端服务；相关业务 API 需要单独部署，并约定同源 API 路由。

接收已构建 ZIP 的 Java 服务不需要为此执行 npm。已有的工程生成与源码构建能力需要另外保留或迁移，不能仅更换服务地址就宣称已经支持。

## 2. 当前前端与兼容边界

核对入口：

| 当前文件                                                                                     | 接入作用                                  |
| -------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `apps/portal/src/services/httpClient.ts`                                                     | 创建 Axios 封装实例，默认 API 前缀 `/api` |
| `apps/portal/src/features/applications/services/applicationService.ts`                       | 应用管理请求集中入口                      |
| `apps/portal/src/types/application.ts`                                                       | 应用、发布版本、任务及详情类型            |
| `apps/portal/src/features/applications/components/ApplicationDetails/ApplicationDetails.tsx` | 当前发布、回滚、版本展示入口              |
| `apps/portal/src/features/applications/components/ApplicationLaunch/ApplicationLaunch.tsx`   | 使用 `launchUrl` 在当前标签页进入应用     |
| `packages/ui/src/utils/applicationRuntime.ts`                                                | 读取后端注入的运行配置                    |
| `packages/ui/src/hooks/useHashRoute.ts`                                                      | 按运行配置的基础路径解析 Hash 路由        |
| `apps/portal/vite.config.ts`                                                                 | 将 `/api` 和 `/apps` 代理到控制服务       |

当前请求封装只返回 HTTP 响应的 `response.data`，不会自动解包 `{ code, data }`。为了兼容，成功响应直接返回业务对象或数组，失败使用非 2xx HTTP 状态和 JSON 错误对象。

管理写请求当前携带 `X-Ocean-Client: portal`。该字段是客户端标识，不是身份凭证；Java 端的上传、发布、删除和恢复操作需要接入实际用户认证与权限校验。前端当前未配置真实 Token 获取回调，需与登录模块一起接入。

页面使用正式业务文案，不增加开发环境、技术栈或架构说明横幅。技术细节放在本文和运维文档中，页面展示应用信息、版本、进度及必要的操作结果。

## 3. 应用包规范

### 3.1 构建与压缩

独立子应用在自身工程中执行：

```shell
npm ci
npm run build
```

将 `dist` 里面的内容压缩为 ZIP。包根目录约定直接包含 `index.html`，不额外套一层 `dist/`：

```text
geographic-information-1.0.0.zip
├── index.html
├── assets/
│   ├── index-<hash>.js
│   └── index-<hash>.css
└── 其他业务静态资源
```

当前内置工作区应用可在前端根目录执行 `npm run build -w @ocean-cloud/geographic-information`，产物位于 `apps/geographic-information/dist`。子应用构建配置仍需满足下面的相对资源约定。

对于当前 Hash 路由方式，Vite 配置采用 `base: './'`，使构建生成的资源引用使用相对路径。应用代码中的图片、Worker、运行时拼接资源地址也要遵守相同约定；仅设置 Vite 的 base 不会自动修复源码里所有硬编码的绝对路径。[Vite 相对基础路径文档](https://vite.dev/guide/build.html#relative-base)

不要将开发服务器地址、某台机器的 IP 或端口写入发布包。API 使用约定的 `/api/...` 同源地址；多个子应用的业务 API 应使用各自命名空间，避免与 `/api/applications` 等平台接口冲突。

### 3.2 接收规则

- 只接受非空 ZIP；校验真实文件结构，不仅检查扩展名或浏览器提交的 MIME。
- `index.html` 必须是有效 UTF-8，并存在约定的主入口资源；验证构建文件完整性，不能仅凭包含 `<html` 字符串认定可发布。
- 不接收源码工程、`node_modules`、Git 目录或服务端可执行包；Java 不执行包中的脚本或命令。
- 解压只允许落在该版本的新建临时目录内。拒绝绝对路径、盘符、反斜杠路径、`..`、符号链接，以及规范化后冲突的文件名。Windows 下同时检查大小写冲突、设备名、尾随点/空格等文件系统限制。
- 解压时按实际读出的字节累计限制总大小、单文件大小与文件数量，不能只信 ZIP 目录声明。拒绝加密包和损坏包。
- 文件名仅用于展示；存储目录与文件名由服务端生成，不直接使用上传文件原名拼接路径。

建议联调初始限制：单 ZIP 100 MiB、解压总量 500 MiB、文件数 10,000。它们是本项目建议值，需结合实际包体调整，并在页面和服务端统一。

## 4. 数据模型

### 4.1 应用 Application

保留现有字段：`id`、`name`、`description`、`route`、`icon`、`enabled`、`isListed`、`sourceKind`、`sourceReady`、`activeReleaseId`、`status`、`launchUrl`、`createdAt`、`updatedAt`、`deletedAt`。

Java 接入包发布时，扩展如下：

| 字段或规则        | 约定                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `sourceKind`      | 现有 `workspace / generated`，新增 `package` 表示上传产物                                 |
| `sourceReady`     | 仍表示工程源码是否准备好；包应用设为 `false`，不用于判定包是否可发布                      |
| `activeReleaseId` | 当前访问版本的服务端 ID；未发布为 `null`                                                  |
| `status`          | 有当前版本为 `published`；包应用未发布为 `draft`；只有尚未生成源码的工程应用为 `creating` |
| `launchUrl`       | 必须为同源相对地址，通常为 `route + '/'`                                                  |
| `sourceDirectory` | 详情响应字段；包应用返回 `null`，前端不展示工程目录                                       |

`published` 表示已有发布版本，不等于应用启用或业务后端健康。应用中心可进入条件为：未删除、已启用、允许展示并且已有发布版本。

`id` 最大 48 字符，格式为 `[a-z][a-z0-9]*(-[a-z0-9]+)*`；创建后不可修改。`route` 最大 80 字符，格式为 `/apps/单段标识`，入库存储时无末尾斜杠。路由最后一段可与应用 ID 不同。名称最多 40 字符，描述最多 200 字符。当前图标只接受 `▧`、`≈`、`◈`、`◎`。

应用 ID 与路由必须唯一，包括回收站中的记录。`isListed=false` 只影响应用中心展示，不代表禁止直接访问；禁止访问由 `enabled` 和删除状态控制。

### 4.2 版本 Release 与任务 Task

| 版本字段                       | 约定                                                                  |
| ------------------------------ | --------------------------------------------------------------------- |
| `id / appId`                   | 服务端生成版本 ID、所属应用 ID                                        |
| `version`                      | 用户可读版本号，1–64 个字母、数字、点、短横线或下划线；同应用内唯一   |
| `origin`                       | `build / upload`，区分源码构建与上传产物                              |
| `status`                       | `pending / ready / failed`；只有 `ready` 可以启用                     |
| `packageSha256`                | 原始上传 ZIP 的 SHA-256；构建来源可为 `null`                          |
| `originalFileName / sizeBytes` | 上传包展示名称与字节数；构建来源可为 `null`                           |
| `sourceHash / sourceRevision`  | 保留源码构建的真实来源信息；上传包为 `null`，不得用包摘要冒充源码摘要 |
| `createdAt / createdBy`        | 创建时间及真实操作者，由后端产生                                      |

当前前端的 `sourceHash/sourceRevision` 是必填字符串，接入时需同步改为可空，并按 `origin` 展示“版本号 / 包摘要”或“源码版本 / 源码摘要”。不能直接对空值调用 `.slice()`。

任务沿用 `id/appId/status/stage/logs/createdAt/finishedAt`，新增可选 `releaseId`；`kind` 从 `generate/publish/rollback` 扩展为 `generate/publish/upload/activate/rollback`。状态保持 `queued/running/succeeded/failed`。时间统一为 ISO 8601 UTC，前端按本地时区显示。

数据库建议使用应用表、版本表、任务表与操作记录表。对 ID、路由和 `(appId, version)` 建立唯一约束；文件物理位置仅由后端维护，不接受前端任意指定。

## 5. API 约定

### 5.1 现有接口的兼容要求

下表是现有 Node API，Java 迁移时需要实现对应能力或明确返回能力不可用，不应静默改变含义。

| 方法与路径                             | 响应与含义                                                          |
| -------------------------------------- | ------------------------------------------------------------------- |
| `GET /api/applications`                | `200 Application[]`，排除已删除记录；管理列表需要看到停用、隐藏应用 |
| `GET /api/applications/{id}`           | `200 { application, sourceDirectory, releases, tasks }`             |
| `POST /api/applications`               | 现有工程创建返回 `202 { application, task }`                        |
| `PUT /api/applications/{id}`           | `200 Application`，更新基本配置                                     |
| `POST /api/applications/{id}/generate` | `202 Task`，重试工程生成                                            |
| `POST /api/applications/{id}/publish`  | `202 Task`，构建当前源码并发布，不能改成上传包接口                  |
| `POST /api/applications/{id}/rollback` | 请求 `{ "releaseId": "..." }`，返回 `202 Task`                      |
| `DELETE /api/applications/{id}`        | `200 Application`，移入回收站                                       |
| `GET /api/deleted-applications`        | `200 Application[]`，删除时间倒序                                   |
| `POST /api/applications/{id}/restore`  | `200 Application`，恢复                                             |

包应用创建仍使用 `POST /api/applications`，请求增加 `sourceKind: "package"`，仅登记应用、不生成工程，返回 `201 { application, task: null }`。前端创建返回类型要允许空任务。旧请求未传 `sourceKind` 时保留原 `generated` 语义；Java 若尚未接入工程生成，返回 `501`，页面只开放已支持的应用来源选项。

创建包应用请求示例：

```json
{
  "id": "ocean-observation",
  "name": "海洋观测",
  "description": "海洋观测数据查询与分析",
  "route": "/apps/ocean-observation",
  "icon": "≈",
  "enabled": true,
  "isListed": true,
  "sourceKind": "package"
}
```

### 5.2 新增上传接口

`POST /api/applications/{id}/releases/upload`，使用 `multipart/form-data`。

| 参数              | 位置           | 约定                                    |
| ----------------- | -------------- | --------------------------------------- |
| `id`              | 路径           | 已登记且未删除的应用                    |
| `file`            | multipart 文件 | 一个符合规范的 ZIP                      |
| `version`         | multipart 文本 | 同应用内唯一版本号                      |
| `Idempotency-Key` | 请求头         | 客户端为本次逻辑上传生成 UUID，重试复用 |
| `X-Ocean-Client`  | 请求头         | `portal`，延续现有客户端标识            |

请求接收阶段必须完成文件持久保存和任务登记，随后返回 `202`：

```json
{
  "releaseId": "release-001",
  "task": {
    "id": "task-001",
    "appId": "ocean-observation",
    "kind": "upload",
    "status": "queued",
    "stage": "等待校验",
    "logs": [],
    "releaseId": "release-001",
    "createdAt": "2026-09-07T09:00:00Z"
  }
}
```

示例 ID 为便于阅读的占位值，实际由服务端生成。`202` 只代表已受理，不代表已经发布。上传任务成功后版本变为 `ready`，当前线上版本仍不切换。

幂等记录应绑定操作者、应用和操作。相同幂等键与相同版本/包摘要返回原任务；同键不同内容返回 `409`。前端上传超时或取消连接不等于后台任务取消，重试前先查询任务，不自动生成新版本。

### 5.3 新增启用版本与任务查询

- `POST /api/applications/{id}/releases/{releaseId}/activate`：请求体 `{}`，携带独立的 `Idempotency-Key`，返回 `202 Task`，`kind=activate`。任务成功后切换当前版本。
- `GET /api/applications/{id}/tasks/{taskId}`：返回 `200 Task`，用于上传与发布任务轮询；校验任务必须属于该应用。
- 原 `GET /api/applications/{id}` 继续返回版本和最近任务，便于复用当前管理页。
- 回滚沿用现有 `/rollback` 接口，目标必须属于该应用且产物完整。上传来源与构建来源的可用版本均可回滚。

同应用的上传、启用、源码发布、生成、回滚互斥；冲突返回 `409`。后端通过事务和应用锁实现，不能仅依赖按钮禁用。启用任务提交与执行时都要重新验证删除状态、版本状态及版本归属。

### 5.4 错误与前端事件

失败响应使用真实 HTTP 状态，例如：

```json
{
  "code": "APPLICATION_PACKAGE_INVALID",
  "message": "应用包根目录缺少 index.html",
  "traceId": "request-001"
}
```

| HTTP 状态   | 场景                                           |
| ----------- | ---------------------------------------------- |
| `400`       | 参数、路由或请求格式错误                       |
| `401 / 403` | 未认证、无操作权限；静态入口停用也返回 403     |
| `404`       | 应用、版本、任务或静态文件不存在；应用已删除   |
| `409`       | 重复路由/版本、任务冲突、幂等请求内容冲突      |
| `413`       | 上传包或请求体超限                             |
| `415`       | 请求格式或文件类型不支持                       |
| `422`       | 应用包结构不符合规范                           |
| `500 / 503` | 后端处理失败或服务暂不可用；未发布入口返回 503 |
| `501`       | 请求的工程生成/构建能力尚未接入                |

当前 Axios 封装对非 2xx 使用预设 HTTP 提示，不会自动把服务端 `message/code` 放入 `RequestError.message/businessCode`。如要展示上面的精确失败原因，需在 `packages/http/src/normalizeRequestError.ts` 中校验后提取可信字段，并补充 413/415 的提示映射；现有 `parseBusinessError` 只处理 2xx 业务响应，不能解决非 2xx 消息提取。

接口 404 只触发请求错误反馈，不跳转整个管理页。不要将失败包裹为 `HTTP 200 + code!=0`，否则现有实例会将其当作成功数据。

## 6. Java 实现分层与发布事务

建议采用 Spring MVC，Spring Boot 与 JDK 版本按实际后端工程统一。下列名称是职责建议，无需创建没有业务逻辑的空包装层：

- `ApplicationController / ApplicationService`：应用配置、删除、恢复。
- `ApplicationReleaseController / ApplicationReleaseService`：上传、启用、回滚。
- `ApplicationPackageValidator`：包结构、路径、资源及大小校验。
- `ApplicationStorageService`：临时文件、不可变版本目录和读取边界。
- `ApplicationTaskService`：任务持久化、并发控制与执行日志。
- `ApplicationResourceController` 或自定义资源解析器：根据路由和当前版本提供页面与资源。

Spring 接收文件的控制器片段如下，仅说明接口形状，DTO、权限校验、Service、异常处理和持久任务执行器需实际实现：[Spring 文件上传文档](https://spring.io/guides/gs/uploading-files/)

```java
@PostMapping(
    value = "/api/applications/{appId}/releases/upload",
    consumes = MediaType.MULTIPART_FORM_DATA_VALUE
)
public ResponseEntity<UploadReleaseResponse> upload(
        @PathVariable("appId") String appId,
        @RequestParam("version") String version,
        @RequestPart("file") MultipartFile file,
        @RequestHeader("Idempotency-Key") String idempotencyKey) {

    // Service 在返回前保存文件与任务，后台执行器只接收已持久化的任务 ID。
    UploadReleaseResponse result = applicationReleaseService.storeAndEnqueue(
            appId, version, file, idempotencyKey);
    return ResponseEntity.accepted().body(result);
}
```

不要把 `MultipartFile` 或其输入流直接交给请求结束后才运行的异步线程。Spring 的 multipart 临时存储会在请求处理结束后清理，应先流式保存到应用持久化目录。[MultipartFile 生命周期说明](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/multipart/MultipartFile.html)

发布处理顺序：

1. 校验身份、权限、应用、版本号、大小限制及幂等键，预留任务和版本记录。
2. 将 ZIP 流式写入服务端生成的临时文件，完成摘要计算，再标记为可执行上传任务。接收失败的预留记录必须置失败或回收。
3. 后台执行器在独立临时目录解压校验；持久化任务阶段和受控长度的日志。
4. 所有文件准备完整后，将目录提升为不可变版本目录，再将版本记录标为 `ready`。
5. 收到启用请求后，在事务中锁定应用，验证版本归属、状态与产物，将 `activeReleaseId` 指向新版本并记录操作者。
6. 发布成功后前端刷新应用列表与详情。失败时保留当前版本及可查询的失败原因。

数据库事务不覆盖文件系统。必须先让完整版本目录可读，再提交当前版本指针；中间崩溃产生的孤立目录由对账任务识别，不能把半成品设为当前版本。同盘移动可采用可用的原子操作；跨盘或不支持原子移动时先完成复制验证，再切换数据库指针。

服务重启后，应对未完成任务按明确规则恢复或标记失败，并释放过期锁。不能遗留永久 `running` 状态。多实例部署需共享持久存储，并使用数据库锁/任务租约；不能让每个实例只读取自己的本地发布目录。

删除延续当前规则：有排队或执行中任务时返回 409；删除后移出列表并使入口返回 404，保留版本、源码与日志，保留 ID 和路由。恢复沿用原启用/展示设置和当前版本。重复删除与重复恢复保持幂等。

## 7. 同源访问与运行配置

### 7.1 动态路由解析

外部只提供一个主平台地址，内部 Java 端口不作为子应用访问地址：

| 请求路径                        | 处理方                                         |
| ------------------------------- | ---------------------------------------------- |
| `/`、`/assets/...`              | 主平台前端静态文件                             |
| `/#/applications`               | 浏览器内的应用中心；`#` 后内容不会发送到服务端 |
| `/api/...`                      | Java 管理接口或已约定的业务 API                |
| `/apps/geographic-information/` | Java 提供地理信息当前版本                      |
| `/apps/marine-information/`     | Java 提供海洋信息当前版本                      |

Java 固定接收 `/apps/**`，按数据库 `route` 匹配应用。匹配边界必须是路由本身或 `route + '/'`，避免 `/apps/map` 误匹配 `/apps/map-other`。不要直接把 URL 中的路由标识当成应用 ID，因为两者允许不同。

访问顺序：检查未删除 → 检查启用 → 检查已发布 → 读取当前版本 → 解析目录内相对文件。无末尾斜杠的应用根地址应重定向到有末尾斜杠的相对地址，使相对资源引用正确。

Spring MVC 支持从资源位置提供静态文件，也支持自定义资源解析器。这里需要在文件读取前查询应用状态和当前版本，不能仅把整个发布根目录通过静态映射公开，否则可能绕过停用、删除和版本访问规则。[Spring 静态资源文档](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-config/static-resources.html)

当前采用 Hash 路由，例如 `/apps/geographic-information/#/layers`。未知 Hash 由子应用 404 页面处理；缺失 `.js/.css` 等资源必须返回真正的 404，不能回退为主平台或子应用 HTML。后续若采用 History 路由，需同时约定 router basename 和只针对页面导航的子应用 SPA fallback。

### 7.2 当前子应用需要的运行配置

Java 返回当前版本入口 HTML 时，在主入口脚本执行前提供如下配置节点：

```html
<script type="application/json" id="ocean-application-config">
  {
    "basePath": "/apps/geographic-information/",
    "portalUrl": "/#/applications",
    "name": "地理信息"
  }
</script>
```

实际值必须取自当前应用记录。使用 JSON 序列化并将 `<` 转义为 `\u003c`，防止名称内容提前结束 script 标签；确保节点只有一份。不要拼接未转义的应用名称，也不要在这里嵌入用户凭证。

当前 `getApplicationRuntime()` 会读取此节点；缺少配置时默认 `basePath='/'`，会影响子应用在 `/apps/.../` 下的路由判断。返回平台使用 `/#/applications`，不写死 localhost 或内部 Java 端口。

应用中心的 `launchUrl` 使用 `/apps/配置路由/`。入口在当前标签页导航，返回也在当前标签页完成，不使用 `window.open` 或 `target="_blank"`。

### 7.3 资源、缓存与访问边界

- 入口 HTML 使用 `Cache-Control: no-store`，发布后重新进入可读取新版本和当前路由配置。
- 带内容摘要且内容不可变的资源可以长期缓存；无版本的固定文件名不能统一设置一年 immutable 缓存。
- 保留历史版本。已打开旧页面请求旧摘要资源时，可以在同应用的历史版本中定位；历史 HTML 不作为当前入口回退。
- 如果业务使用 `config.json` 等跨版本同名资源，需要显式版本化资源 URL 才能保证旧页面仍拿到匹配内容。仅保留文件目录不足以解决同名资源歧义。
- 所有资源读取仍需校验应用删除/停用状态、版本归属和真实文件路径，阻止目录穿越与目录列表访问。
- 同源子应用具有同源浏览器权限，因此该模式只发布经过授权的可信应用；应用管理权限必须由后端校验，不能仅靠隐藏前端按钮。

## 8. 前端上传对接

在应用业务 Service 增加上传方法，组件通过 Service 调用，保持现有 Axios 封装。下面是拟新增代码片段，其中响应类型需按第 5 节补齐：

```typescript
export function uploadApplicationPackage(
  appId: string,
  file: File,
  version: string,
  idempotencyKey: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
) {
  const form = new FormData()
  form.append('file', file)
  form.append('version', version)

  return httpClient.post<UploadReleaseResponse>(
    '/applications/' + encodeURIComponent(appId) + '/releases/upload',
    form,
    {
      headers: {
        'X-Ocean-Client': 'portal',
        'Idempotency-Key': idempotencyKey,
      },
      timeout: 600_000,
      signal,
      onUploadProgress(event) {
        if (event.total && event.total > 0) {
          onProgress(
            Math.min(100, Math.round((event.loaded / event.total) * 100)),
          )
        }
      },
    },
  )
}
```

`httpClient` 从当前业务 Service 的应用级入口引入。浏览器 `FormData` 上传由浏览器/Axios 处理 multipart boundary，不手写不完整的 `Content-Type`。[Axios multipart 用法](https://axios-http.com/docs/multipart)

默认 HTTP 超时为 15 秒，上传示例单独设置为 10 分钟；限额和超时需与网关、Java 对齐。上传进度 100% 只表示请求内容已发送，后续还要展示校验和发布状态，不能立即提示“发布成功”。

页面流程：选择文件与版本号 → 上传 → 轮询上传任务 → 版本 ready → 启用版本 → 轮询发布任务 → 刷新应用列表和详情。可将这些步骤组合成“上传并发布”，但仍要分别处理失败。

需要修改的前端对接点：

1. 扩展应用与版本类型，允许 `sourceKind=package`、空工程目录和空源码字段；创建请求增加应用来源。
2. 创建/编辑界面按实际后端能力提供应用来源，创建后不随意切换来源。
3. 包应用显示“上传版本 / 发布”，不能因 `sourceReady=false` 显示“重新生成工程”；工程应用继续走原构建流程。
4. 版本列表展示版本号、来源、包摘要或源码信息，仅 ready 版本可发布/回滚。
5. 新增命名组件和就近 CSS Modules，表单弹窗内部滚动；提供文件选择、真实进度、状态及失败结果。
6. 在同应用有任务时禁用冲突操作，任务结束后刷新应用状态；前端禁用不替代服务端锁。
7. 按第 5.4 节完善请求错误字段映射；认证信息接入应用级请求实例，组件不直接读取或拼接凭证。

## 9. Java 与 Nginx 配置示例

以下是单机 Windows 联调示例，目录及服务名为规划值，不代表本机已创建或已部署。Spring 配置示例中的 `spring.servlet.multipart` 是框架配置；`ocean.*` 是拟定义的项目配置，需要通过 `@ConfigurationProperties` 等方式绑定并实际执行限制。

```yaml
server:
  address: 127.0.0.1
  port: 8080

spring:
  servlet:
    multipart:
      max-file-size: 100MB
      max-request-size: 110MB
      file-size-threshold: 0
      location: D:/OceanCloud/data/multipart

ocean:
  storage:
    root: D:/OceanCloud/data
  packages:
    max-expanded-bytes: 524288000
    max-file-count: 10000
```

Spring 支持配置单文件、整次 multipart 请求的上限以及临时目录；启动前创建目录并赋予服务账户相应访问权限。[Spring multipart 配置](https://docs.spring.io/spring-boot/3.3/api/java/org/springframework/boot/autoconfigure/web/servlet/MultipartProperties.html)

规划存储结构：

```text
D:/OceanCloud/
├── portal/                         # 主平台 apps/portal/dist 的内容
├── service/                        # Java 服务程序及配置
└── data/
    ├── multipart/                  # 请求阶段临时文件
    ├── uploads/<taskId>/package.zip # 已持久接收的原始包
    ├── staging/<taskId>/            # 解压校验目录
    └── releases/<appId>/<releaseId>/# 不可变发布产物
```

Nginx 示例为 `http` 上下文中的一个 `server`。这里使用 80 作为示例统一入口；正式地址、TLS、认证及超时应结合部署环境配置。Java 只接受可信入口访问，转发头也只信任实际代理。

```nginx
server {
    listen 80;
    server_name _;
    root D:/OceanCloud/portal;
    index index.html;
    client_max_body_size 110m;

    proxy_set_header Host $http_host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_read_timeout 600s;
    }

    location /apps/ {
        proxy_pass http://127.0.0.1:8080;
    }

    location = /index.html {
        add_header Cache-Control "no-store";
    }

    location / {
        try_files $uri $uri/ =404;
    }
}
```

`proxy_pass` 此处不带末尾 `/` 或替换路径，使 `/api/...`、`/apps/...` 原样传给 Java；Nginx 的请求体上限也要覆盖 multipart 开销。[Nginx 代理说明](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)、[请求体大小限制](https://nginx.org/en/docs/http/ngx_http_core_module.html#client_max_body_size)

不要把 `/apps/` 直接映射到整个 `releases/` 根目录。上面固定转发 `/apps/` 给 Java，新增应用和调整路由无需逐个新增 Nginx location。

## 10. 联调、迁移与部署步骤

1. Java 团队实现应用、上传、任务、版本启用、回滚、删除恢复及动态资源入口；数据库和文件目录配置完成后启动服务。
2. 前端完成第 8 节的类型和页面对接。仅修改代理地址不能自动获得上传能力。
3. 开发环境在前端根目录使用下面的 PowerShell 命令，只启动主平台也可对接已经由 Java 发布的子应用：

   ```powershell
   $env:OCEAN_CONTROL_TARGET = 'http://127.0.0.1:8080'
   npm run dev -w @ocean-cloud/portal
   ```

   `OCEAN_CONTROL_TARGET` 在 Vite 启动时读取，修改后需要重启对应进程；`VITE_API_BASE_URL` 保持 `/api`。浏览器继续访问 5173，`/api` 与 `/apps` 都通过同一个代理入口。

4. 如需迁移当前本机数据，在停止写入后备份 `Ocean_Cloud_Control/var`，将 `database.json` 中的应用、版本与任务转换入库，并复制相应产物。保留 ID、路由、当前版本、删除状态及原启用/展示状态；新字段从真实数据生成，不把旧源码摘要当作 ZIP 摘要。新建空库方案则需要重新登记并上传应用。
5. 在前端根目录执行 `npm ci` 和 `npm run build -w @ocean-cloud/portal`，将 `apps/portal/dist` 内容发布到统一入口的 portal 目录。
6. 部署实际构建出的 Java 服务程序，创建持久目录并检查数据库连接、服务端口、权限、磁盘空间和存储可读性。Java 产物名称以实际后端工程为准，本文不假定已有 JAR。
7. 使用部署环境的 Nginx 执行 `nginx -t`，配置通过后启动或重载。主平台、API、子应用都通过统一入口验证。
8. 在应用管理中创建包应用、配置路由、上传第一个版本、发布，再从应用中心进入。发布第二个版本并验证回滚。

原工程生成/源码发布若暂时仍由 Node 执行，Java 必须有明确的内部任务适配与唯一的数据归属，不能让两套服务独立修改应用和当前版本指针。完成迁移后再切换统一入口，不在用户浏览器中混用两套应用注册表。

## 11. 验收与运维

交付至少验证以下行为，测试包、任务数据和测试脚本只在本地或测试环境保留，不加入前端交付仓库：

| 场景                               | 预期                                              |
| ---------------------------------- | ------------------------------------------------- |
| 正常 ZIP 上传                      | 可查询真实进度和校验任务；成功产生 ready 版本     |
| 缺少 index、错误目录层级、损坏包   | 明确失败；当前版本保持不变                        |
| 超限包、路径穿越、链接或冲突文件名 | 拒绝接收/解压，不产生目录外文件                   |
| 同键重试上传或发布                 | 返回原结果/任务，不重复发布                       |
| 重复版本号、并发发布/删除          | 409；无覆盖与状态竞争                             |
| 新版本发布                         | HTML 与资源可读，JS/CSS MIME 正确，无内部端口泄漏 |
| 应用路由修改                       | 新路由可用，旧路由 404；无硬编码资源路径故障      |
| 子应用进入、刷新、返回、浏览器后退 | 始终同标签页、同 IP 和端口，子应用路由正常        |
| 旧页面延迟加载资源                 | 获取与旧页面匹配的版本资源                        |
| 缺失静态文件或未知应用             | 返回真实 404，不能返回主平台 HTML                 |
| 已停用、已删除、未发布             | 入口分别为 403、404、503                          |
| 回滚、删除后恢复、服务重启         | 版本和配置持久保留，任务不永久卡住                |
| 未认证/无权限操作                  | 后端拒绝，前端显示对应业务反馈                    |

升级 Java 程序和主平台静态文件时，保留数据库与 `data`。备份应覆盖元数据及其对应版本文件，并在停止写入或一致性快照条件下完成；只备份其中一部分无法保证恢复。

版本清理仅处理明确超过保留策略且未被当前版本、运行任务或回滚策略引用的内容；先提供预览与明确的运维操作，不在服务启动时清空目录。原始包、临时目录、历史版本和日志分别制定保留期限。

记录上传人、发布人、时间、版本、包摘要、任务 ID 与失败原因。监控磁盘空间、上传失败率、任务时长、入口错误率；不要记录身份凭证或把服务器异常堆栈直接返回用户。

## 12. 实施范围清单

本说明已明确接口与流程，实际落地仍需完成：

- Java 工程、数据库迁移、认证授权、包校验、持久任务和资源托管实现。
- 前端上传入口、版本来源展示、类型扩展与错误消息映射。
- 当前运行配置协议兼容、同源部署配置及真实发布/回滚验证。
- 如继续支持平台生成工程与源码构建，完成对应执行器接入并验证原有流程。

相关本地文档：[主平台与子平台开发教程](platform-development-guide.md)、[开发规范](development-standards.md)、[HTTP 请求与错误处理](http-client.md)、[文档目录](README.md)。当前接口行为以源码及本文明确标注的现状/拟新增约定为准。
