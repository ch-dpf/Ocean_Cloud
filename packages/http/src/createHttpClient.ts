import axios from 'axios'
import type { AxiosResponse, Method } from 'axios'
import { RequestError } from './RequestError.ts'
import { normalizeRequestError } from './normalizeRequestError.ts'
import type {
  HttpClientOptions,
  RequestErrorHandler,
  RequestOptions,
} from './types.ts'
/** 读请求失败后的自动重试次数上限（含首次尝试）：两次都不成功才报错 */
const READ_RETRY_ATTEMPTS = 2

/** 重试前的等待时长，与分片上传的退避基数保持一致 */
const RETRY_DELAY_MS = 500

/**
 * 只重试「再试一次有意义」的失败：无响应、超时、服务端 5xx、限流。
 * 业务失败与 401/403/404/参数校验等 4xx 重试必然再失败，取消更不该重试。
 */
const RETRYABLE_ERROR_KINDS: readonly string[] = [
  'network',
  'timeout',
  'server',
  'rate-limit',
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function createHttpClient(options: HttpClientOptions = {}) {
  const instance = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeout ?? 15_000,
  })
  const listeners = new Set<RequestErrorHandler>()
  instance.interceptors.request.use((config) => {
    const token = options.getAccessToken?.()
    if (token) config.headers.set('Authorization', 'Bearer ' + token)
    return config
  })
  instance.interceptors.response.use((response) => {
    const businessError = options.parseBusinessError?.(response.data)
    if (businessError)
      throw new RequestError(businessError.message, 'business', {
        status: response.status,
        businessCode: businessError.code,
      })
    return response
  })
  async function request<T>(
    method: Method,
    url: string,
    data: unknown,
    requestOptions: RequestOptions = {},
  ): Promise<T> {
    const { silentError = false, ...config } = requestOptions
    const startedAt = Date.now()
    // 调试回调不允许影响请求本身
    function report(status: number) {
      try {
        options.onResponse?.({
          method,
          url,
          status,
          durationMs: Date.now() - startedAt,
        })
      } catch {
        /* 调试回调抛错不影响请求结果 */
      }
    }
    // 只有读请求自动重试：写请求不重试（见 docs/http-client.md），避免重复提交。
    // 重试期间不广播错误，只有最终失败才广播一次，因此「上传进度」那类提示不会被中间失败打扰。
    const maxAttempts = method === 'GET' ? READ_RETRY_ATTEMPTS : 1
    for (let attempt = 1; ; attempt += 1) {
      try {
        const response = await instance.request<T, AxiosResponse<T>>({
          ...config,
          method,
          url,
          data,
          validateStatus: (status) => status >= 200 && status < 300,
        })
        report(response.status)
        return response.data
      } catch (cause) {
        const error = normalizeRequestError(cause)
        if (
          attempt < maxAttempts &&
          RETRYABLE_ERROR_KINDS.includes(error.kind)
        ) {
          await sleep(RETRY_DELAY_MS)
          continue
        }
        report(error.status ?? 0)
        if (!silentError && error.kind !== 'canceled') {
          for (const listener of listeners) {
            try {
              listener(error)
            } catch {
              /* Subscribers must not replace the original request failure. */
            }
          }
        }
        throw error
      }
    }
  }
  function onError(handler: RequestErrorHandler) {
    listeners.add(handler)
    return () => {
      listeners.delete(handler)
    }
  }
  return {
    get: <T>(url: string, config?: RequestOptions) =>
      request<T>('GET', url, undefined, config),
    post: <T>(url: string, data?: unknown, config?: RequestOptions) =>
      request<T>('POST', url, data, config),
    put: <T>(url: string, data?: unknown, config?: RequestOptions) =>
      request<T>('PUT', url, data, config),
    patch: <T>(url: string, data?: unknown, config?: RequestOptions) =>
      request<T>('PATCH', url, data, config),
    delete: <T>(url: string, config?: RequestOptions) =>
      request<T>('DELETE', url, undefined, config),
    onError,
    onStatus(status: number, handler: RequestErrorHandler) {
      return onError((error) => {
        if (error.status === status) handler(error)
      })
    },
    onBusinessCode(code: string | number, handler: RequestErrorHandler) {
      return onError((error) => {
        if (error.businessCode === code) handler(error)
      })
    },
  }
}
export type HttpClient = ReturnType<typeof createHttpClient>
