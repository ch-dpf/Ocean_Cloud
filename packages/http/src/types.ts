import type { AxiosRequestConfig } from 'axios'
import type { RequestError } from './RequestError.ts'
export type RequestErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'conflict'
  | 'rate-limit'
  | 'server'
  | 'http'
  | 'network'
  | 'timeout'
  | 'canceled'
  | 'business'
  | 'unknown'
export interface RequestOptions extends Omit<
  AxiosRequestConfig,
  'url' | 'method' | 'data' | 'validateStatus'
> {
  readonly silentError?: boolean
  /** 某些已自行调度的读请求可以关闭自动重试。 */
  readonly retry?: boolean
}
export type RequestErrorHandler = (error: RequestError) => void
export interface BusinessError {
  readonly code: string | number
  readonly message: string
}
/** 单次请求的响应摘要，供开发期计时、日志等调试使用 */
export interface HttpResponseInfo {
  /** 请求方法，如 GET */
  readonly method: string
  /** 请求路径（不含 baseURL） */
  readonly url: string
  /** HTTP 状态码；请求未到达或未返回时为 0 */
  readonly status: number
  /** 从发出请求到拿到响应（或失败）的毫秒数 */
  readonly durationMs: number
}
export interface HttpClientOptions {
  readonly baseURL?: string
  readonly timeout?: number
  readonly getAccessToken?: () => string | null | undefined
  readonly parseBusinessError?: (data: unknown) => BusinessError | null
  /** 成功与失败都会回调，用于开发期打印请求耗时 */
  readonly onResponse?: (info: HttpResponseInfo) => void
}

/** 需要 ETag 等响应头的编辑接口使用；普通请求仍只返回 data。 */
export interface HttpResponse<T> {
  readonly data: T
  readonly status: number
  readonly headers: Headers
}
