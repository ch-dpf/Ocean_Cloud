import { apiBaseUrl, httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  FileMeta,
  FileMetaPage,
  FileMetaPageQuery,
  FileScope,
} from '../types/fileMeta'

/** 分页查询数据文件；不传 dataSetId / categoryId 时查询全部数据，筛选条件为空时不提交该参数 */
export async function getFileMetaPage(
  query: FileMetaPageQuery,
  signal?: AbortSignal,
): Promise<FileMetaPage> {
  const result = await httpClient.get<ApiResult<FileMetaPage>>(
    '/filemeta/page',
    {
      params: {
        current: query.current,
        size: query.size,
        ...(query.dataSetId ? { dataSetId: query.dataSetId } : {}),
        ...(query.categoryId !== undefined
          ? { categoryId: query.categoryId }
          : {}),
        ...(query.originalName ? { originalName: query.originalName } : {}),
        ...(query.extension ? { extension: query.extension } : {}),
      },
      signal,
    },
  )
  return result.data
}

/** 整选分类或数据集时逐页拉全量的每页条数：取大一些以减少请求次数 */
const BULK_PAGE_SIZE = 200

/**
 * 拉取某个范围下的全部数据文件，供「整选整个分类 / 某个数据集」使用。
 * 逐页查询直到累计条数达到 total 或遇到空页为止。
 */
export async function getAllFileMeta(
  scope: FileScope,
  signal?: AbortSignal,
): Promise<readonly FileMeta[]> {
  const dataSetId = scope.kind === 'dataset' ? scope.dataSetId : undefined
  const categoryId = scope.kind === 'category' ? scope.categoryId : undefined
  const files: FileMeta[] = []
  let current = 1
  for (;;) {
    const page = await getFileMetaPage(
      { current, size: BULK_PAGE_SIZE, dataSetId, categoryId },
      signal,
    )
    files.push(...page.records)
    if (page.records.length === 0 || files.length >= Number(page.total)) break
    current += 1
  }
  return files
}

/** 分页查询回收站（已删除）的数据文件 */
export async function getDeletedFileMetaPage(
  query: { readonly current: number; readonly size: number },
  signal?: AbortSignal,
): Promise<FileMetaPage> {
  const result = await httpClient.get<ApiResult<FileMetaPage>>(
    '/filemeta/deleted/page',
    { params: { current: query.current, size: query.size }, signal },
  )
  return result.data
}

/** 恢复回收站里的数据文件 */
export async function restoreDeletedFileMeta(id: string): Promise<void> {
  await httpClient.put<ApiResult<unknown>>(
    '/filemeta/deleted/' + encodeURIComponent(id) + '/restore',
  )
}

/** 彻底删除回收站里的数据文件（不可恢复） */
export async function purgeDeletedFileMeta(id: string): Promise<void> {
  await httpClient.delete<ApiResult<unknown>>(
    '/filemeta/deleted/' + encodeURIComponent(id),
  )
}

/** 删除数据文件元数据 */
export async function deleteFileMeta(id: string): Promise<void> {
  await httpClient.delete<ApiResult<unknown>>(
    '/filemeta/' + encodeURIComponent(id),
  )
}

/**
 * 数据文件的下载直链：交给浏览器原生导航下载（<a href>），整个文件流式落盘，
 * 不经过 axios，因此不会把文件读进内存。导航请求无法附加 Authorization 头，
 * 所以该地址不带鉴权，由后端放行（详见 DataManagementPage 的下载按钮）。
 */
export function buildFileDownloadUrl(id: string): string {
  return `${apiBaseUrl}/filemeta/${encodeURIComponent(id)}/download`
}
