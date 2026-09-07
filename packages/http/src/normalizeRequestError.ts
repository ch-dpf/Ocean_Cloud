import axios from 'axios'
import { RequestError } from './RequestError.ts'
import type { RequestErrorKind } from './types.ts'
const HTTP_ERRORS: Readonly<
  Record<number, { kind: RequestErrorKind; message: string }>
> = {
  400: { kind: 'validation', message: '请求参数有误，请检查后重试。' },
  401: { kind: 'unauthorized', message: '登录状态已失效，请重新登录。' },
  403: { kind: 'forbidden', message: '你没有权限执行此操作。' },
  404: { kind: 'not-found', message: '请求的资源不存在或已被移除。' },
  408: { kind: 'timeout', message: '请求超时，请稍后重试。' },
  409: { kind: 'conflict', message: '数据状态已变化，请刷新后重试。' },
  422: { kind: 'validation', message: '提交内容未通过校验。' },
  429: { kind: 'rate-limit', message: '请求过于频繁，请稍后重试。' },
}
export function normalizeRequestError(error: unknown): RequestError {
  if (error instanceof RequestError) return error
  if (axios.isCancel(error))
    return new RequestError('请求已取消。', 'canceled', { cause: error })
  if (!axios.isAxiosError(error))
    return new RequestError('请求处理失败，请稍后重试。', 'unknown', {
      cause: error,
    })
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
    return new RequestError('请求超时，请稍后重试。', 'timeout', {
      cause: error,
    })
  const status = error.response?.status
  if (status) {
    const preset = HTTP_ERRORS[status]
    if (preset)
      return new RequestError(preset.message, preset.kind, {
        status,
        cause: error,
      })
    return new RequestError(
      status >= 500 ? '服务暂时不可用，请稍后重试。' : '请求失败，请稍后重试。',
      status >= 500 ? 'server' : 'http',
      { status, cause: error },
    )
  }
  return new RequestError('网络连接失败，请检查网络或服务地址。', 'network', {
    cause: error,
  })
}
