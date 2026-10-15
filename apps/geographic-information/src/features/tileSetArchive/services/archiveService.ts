import { apiBaseUrl, httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type { ArchivePage, TileSetArchive } from '../types/archive'

/**
 * 发起归档：把已完成处理任务的瓦片集打成静态成果包。
 * processingTaskId 是 int64，超出 JS 安全整数范围（如 2109582884358426625），
 * JSON.stringify 会把它变成带引号的字符串或改写末位，因此手拼 JSON 把原字符串写成数字字面量。
 */
function serializeArchiveBody(processingTaskId: string): string {
  const value = /^\d+$/.test(processingTaskId)
    ? processingTaskId
    : JSON.stringify(processingTaskId)
  return `{"processingTaskId":${value}}`
}

export async function createTileSetArchive(
  processingTaskId: string,
): Promise<void> {
  await httpClient.post<ApiResult<unknown>>(
    '/tile-set-archives',
    serializeArchiveBody(processingTaskId),
    { headers: { 'Content-Type': 'application/json' } },
  )
}

/** 分页查询归档记录 */
export async function getArchivePage(
  query: { readonly current: number; readonly size: number },
  signal?: AbortSignal,
): Promise<ArchivePage> {
  const result = await httpClient.get<ApiResult<ArchivePage>>(
    '/tile-set-archives/page',
    { params: { current: query.current, size: query.size }, signal },
  )
  return result.data
}

/** 查询单条归档详情；archiveNo 走路径参数 */
export async function getArchiveDetail(
  archiveNo: string,
  signal?: AbortSignal,
): Promise<TileSetArchive> {
  const result = await httpClient.get<ApiResult<TileSetArchive>>(
    '/tile-set-archives/' + encodeURIComponent(archiveNo),
    { signal },
  )
  return result.data
}

/** 重试失败的归档任务 */
export async function retryArchive(archiveNo: string): Promise<void> {
  await httpClient.post<ApiResult<unknown>>(
    '/tile-set-archives/' + encodeURIComponent(archiveNo) + '/retry',
  )
}

/**
 * 归档成果包的下载直链：交给浏览器原生导航下载（<a href>），整包流式落盘，不进内存。
 * 导航请求无法附加 Authorization 头，所以该地址不带鉴权，由后端放行
 * （与数据管理页的数据下载同一套取舍）。
 */
export function buildArchiveDownloadUrl(archiveNo: string): string {
  return `${apiBaseUrl}/tile-set-archives/${encodeURIComponent(archiveNo)}/download`
}
