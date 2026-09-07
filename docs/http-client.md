# Axios 请求封装与错误处理

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

两应用均挂载 RequestErrorNotice，消费 onError 显示可关闭的提示。订阅者抛错不会覆盖原始请求错误。onStatus / onBusinessCode 是过滤订阅，和 onError 可同时触发；同一个失败只广播一次，避免在多个订阅者中重复弹提示。

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

此时资源 Service 请求 /resources，期望 ResourceRecord[]。若后端使用 envelope，在 Service 显式取 data 并校验。
两个应用的 .env.example 均提供 API base 配置。使用跨域 API 时由后端允许来源；使用 /api 则由部署反向代理映射，当前没有虚构代理目标。

## 404 边界

主应用及资源中心都处理未知 Hash 路由，未知根路径在 Vite SPA 回退后也显示 404。返回首页使用站点根路径。
正式静态服务器需要配置 SPA fallback 到各自 index.html，否则服务器自身的 404 会先于前端发生。
API 404 走请求事件，页面 404 走路由，两者分开。

## 验证与参考

npm test 使用 Node 本地 HTTP 服务真实验证请求参数、JSON、动态 Token、13 种状态码、业务错误、超时、网络失败、取消及退订；不依赖外部后端。
实现参考 [Axios 官方文档](https://axios-http.com/docs/interceptors) 与 [错误处理](https://axios-http.com/docs/handling_errors)。
