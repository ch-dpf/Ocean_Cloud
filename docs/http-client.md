# Axios 请求封装与错误处理

开发操作见 [主平台与子平台开发教程](platform-development-guide.md)，Java 包发布契约见 [Java 后端接入说明](java-backend-integration.md)。

## 使用入口

封装在 packages/http，各应用在 services/httpClient.ts 创建自己的实例，避免微前端之间共享 Token 或拦截器状态。组件只调用业务 Service。

```typescript
import { httpClient } from '../../../services/httpClient'

export function getResources(signal?: AbortSignal) {
  return httpClient.get<ResourceRecord[]>('/resources', {
    params: { page: 1 },
    signal,
  })
}
```

支持 get、post、put、patch、delete，均返回 Promise<T>，只取 HTTP 响应的 data，不擅自解包业务 data。泛型不替代后端响应的运行时校验。
默认超时 15 秒；支持 signal、params、headers、responseType 等 Axios 参数；请求失败始终 reject RequestError。
`silentError: true` 仅关闭事件广播，不将失败转换为成功。
请求实例不暴露给组件，不自动重试写请求，不假定登录页地址，也不进行自动 Token 刷新。
读请求（GET）在**无响应、超时、服务端 5xx、429** 时自动重发一次（共两次尝试，间隔 500ms），两次都失败才广播错误；业务失败与 401/403/404/参数校验等 4xx 不重试，用户主动取消更不重试。

## 错误码和处理事件

| 返回情况        | RequestError.kind | 默认处理                               |
| --------------- | ----------------- | -------------------------------------- |
| 400 / 422       | validation        | 参数或校验提示                         |
| 401             | unauthorized      | 登录失效提示；应用可订阅以接入认证流程 |
| 403             | forbidden         | 无权限提示                             |
| 404             | not-found         | 资源不存在提示，保留当前页面           |
| 408             | timeout           | 请求超时提示                           |
| 409             | conflict          | 数据冲突，建议刷新                     |
| 429             | rate-limit        | 请求过频提示                           |
| 500–599         | server            | 服务不可用提示                         |
| 其他非 2xx      | http              | 请求失败提示                           |
| 无响应/网络故障 | network           | 网络或服务地址提示                     |
| 客户端超时      | timeout           | 超时提示                               |
| 主动取消        | canceled          | 不广播、不弹提示，但仍 reject          |
| 业务错误        | business          | 使用调用方解析出的业务提示             |
| 其他异常        | unknown           | 通用请求处理失败提示                   |

```typescript
const unsubscribeAll = httpClient.onError((error) => {
  // 可统一记录 error.kind / error.status / error.businessCode。
  // 不直接记录 cause；它可能含请求配置与凭证。
})
const unsubscribe401 = httpClient.onStatus(401, () => {
  // 在这里接入实际会话过期事件；当前项目没有认证模块。
})
const unsubscribeBusiness = httpClient.onBusinessCode('TOKEN_EXPIRED', () => {
  // 接入约定的业务处理。
})

// React effect 返回这些 unsubscribe，避免重复订阅。
unsubscribeAll()
unsubscribe401()
unsubscribeBusiness()
```

主平台和当前子应用在入口挂载 RequestErrorNotice，消费 onError 显示可关闭的提示。订阅者抛错不会覆盖原始请求错误。onStatus / onBusinessCode 是过滤订阅，和 onError 可同时触发；同一个失败只广播一次，避免在多个订阅者中重复弹提示。

当前 normalizeRequestError 对非 2xx 采用预设 HTTP 提示，不自动提取响应 JSON 中的 message/code；413、415 等未单独列出的状态走通用 http 分类。精确业务错误需要校验后提取字段并完善映射，不能假定 onBusinessCode 已覆盖所有非 2xx 业务码。

## 业务码和 Token 配置

后端业务协议尚未提供，不预设 0 / 200 / success 的成功含义。通过创建实例时传入 parseBusinessError 显式配置：

```typescript
const client = createHttpClient({
  baseURL: '/api',
  getAccessToken: () => authStore.accessToken,
  parseBusinessError(payload) {
    if (!payload || typeof payload !== 'object' || !('code' in payload))
      return null
    const result = payload as { code: unknown; message?: unknown }
    if (result.code === 0) return null // 仅作协议示例
    if (typeof result.code !== 'string' && typeof result.code !== 'number')
      return null
    return {
      code: result.code,
      message:
        typeof result.message === 'string' ? result.message : '业务操作失败。',
    }
  },
})
```

Token 在每次请求前读取；未配置则不注入 Authorization。业务错误解析只针对 2xx 响应；非 2xx 优先按 HTTP 状态处理。回调返回 null 代表无业务错误，具体成功结构必须根据实际后端调整。

## 示例和真实接口

资源中心默认通过同一 Axios 封装请求 /mock/resources.json，保留三条演示元数据，验证实际请求而非组件内静态数组。
接入真实服务时设置 apps/resources/.env.local：

```dotenv
VITE_USE_MOCK_DATA=false
VITE_API_BASE_URL=https://your-api.example.com/api
```

此时资源 Service 请求 /resources，期望 ResourceRecord[]。若后端使用 envelope，在 Service 显式取 data 并校验。resources 当前仅为保留示例，不在应用中心登记。
各应用的 .env.example 提供 API base 配置。主平台 Vite 已将 /api 与 /apps 代理到应用控制服务；地理信息、海洋信息的独立 Vite 配置尚未添加业务 API 代理。真实业务接口应按命名空间配置目标，不由控制服务自动实现。使用跨域 API 时由后端允许来源；使用同源 /api 时由开发代理或部署网关映射。

## 404 边界

主平台和子应用处理未知 Hash 路由。子应用通过运行配置的 basePath 判断基础路径，返回首页和返回主平台分别使用应用基础路径及 portalUrl。
当前正式子应用 URL 为 /apps/配置路由/#/内部页面；Hash 后内容不发送到服务端，不需要为每个内部页面配置服务器路径回退。缺失静态文件返回真实 404，不能将所有请求回退到 HTML。若采用 History 路由，需要另行设计应用级页面 fallback。
API 404 走请求事件，页面 404 走路由，两者分开。

## 验证与参考

请求层变更可使用实际存在的本地测试脚本验证请求参数、JSON、Token、HTTP 状态、业务错误、超时、网络失败、取消及退订；当前根 package.json 没有 npm test 命令。测试文件不随仓库分发，npm run check 不依赖这些文件。
实现参考 [Axios 官方文档](https://axios-http.com/docs/interceptors) 与 [错误处理](https://axios-http.com/docs/handling_errors)。

## 带响应头的编辑请求

getWithResponse、postWithResponse、putWithResponse 返回 HttpResponse<T>，包含 data、status 和标准 Headers 对象；原 get/post/put/patch/delete 仍只返回响应体。

```typescript
const response = await httpClient.getWithResponse<ApiResult<VectorStyle>>(path)
const etag = response.headers.get('ETag')
// 业务 Service 校验 etag 非空后保存；更新时原样传回，不自行拼接版本。
await httpClient.putWithResponse(path, body, {
  headers: { 'If-Match': etag },
  signal,
  silentError: true,
})
```

样式接口使用这些方法读取 ETag，并解包业务 data。缺少响应头时拒绝继续编辑；HTTP 412 保留草稿，由用户选择重新加载或另存。写操作仍不自动重试。部署代理必须保留 ETag，跨域访问需暴露 ETag 响应头。

### 自行调度的读请求

RequestOptions 支持 `retry:false`，仅关闭当前请求的通用GET自动重试。矢量瓦片已在业务服务内合并及排队，使用此选项避免503再次放大负载；其他GET与所有写接口原有策略保持不变。该选项在HTTP封装内消费，不作为Axios配置或请求头发送。
