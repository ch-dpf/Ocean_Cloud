import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  LogPage,
  LogQueryParams,
  SysExceptionLog,
  SysLoginLog,
  SysOperationLog,
} from '../types/log'

/** 三个日志接口的请求参数一致，只是路径与返回记录类型不同 */
async function getLogPage<T>(
  path: string,
  query: LogQueryParams,
  signal?: AbortSignal,
): Promise<LogPage<T>> {
  const result = await httpClient.get<ApiResult<LogPage<T>>>(path, {
    params: {
      current: query.current,
      size: query.size,
      ...(query.username ? { username: query.username } : {}),
      ...(query.startTime ? { startTime: query.startTime } : {}),
      ...(query.endTime ? { endTime: query.endTime } : {}),
      ...(query.status !== undefined ? { status: query.status } : {}),
    },
    signal,
  })
  return result.data
}

/** 系统异常日志 */
export function queryExceptionLogs(
  query: LogQueryParams,
  signal?: AbortSignal,
): Promise<LogPage<SysExceptionLog>> {
  return getLogPage<SysExceptionLog>('/log/exception/query', query, signal)
}

/** 系统操作日志 */
export function queryOperationLogs(
  query: LogQueryParams,
  signal?: AbortSignal,
): Promise<LogPage<SysOperationLog>> {
  return getLogPage<SysOperationLog>('/log/operation/query', query, signal)
}

/** 系统登录日志 */
export function queryLoginLogs(
  query: LogQueryParams,
  signal?: AbortSignal,
): Promise<LogPage<SysLoginLog>> {
  return getLogPage<SysLoginLog>('/log/login/query', query, signal)
}

/** 按日志类别取查询函数，便于表格组件直接传入分页 hook */
export const LOG_QUERIES = {
  exception: queryExceptionLogs,
  operation: queryOperationLogs,
  login: queryLoginLogs,
} as const

/** 三个删除接口路径一致，只是日志类别不同 */
async function deleteLog(path: string, id: string): Promise<void> {
  await httpClient.delete<ApiResult<unknown>>(
    `${path}/${encodeURIComponent(id)}`,
  )
}

/** 删除系统异常日志 */
export function deleteExceptionLog(id: string): Promise<void> {
  return deleteLog('/log/exception', id)
}

/** 删除系统操作日志 */
export function deleteOperationLog(id: string): Promise<void> {
  return deleteLog('/log/operation', id)
}

/** 删除系统登录日志 */
export function deleteLoginLog(id: string): Promise<void> {
  return deleteLog('/log/login', id)
}

/** 按日志类别取删除函数，便于表格组件直接传入面板 */
export const LOG_DELETES = {
  exception: deleteExceptionLog,
  operation: deleteOperationLog,
  login: deleteLoginLog,
} as const
