import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type { FileMetaPage, FileMetaPageQuery } from '../types/fileMeta'
import type { UploadTask } from '../types/task'

/** 分页查询数据文件；不传 dataSetId / categoryId 时查询全部数据 */
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
      },
      signal,
    },
  )
  return result.data
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

/** 上传数据文件：多文件通过同一个 files 字段提交，返回后端创建的处理任务 */
export async function uploadFileMeta(input: {
  readonly dataSetId: string
  readonly files: readonly File[]
}): Promise<UploadTask> {
  const form = new FormData()
  form.append('dataSetId', input.dataSetId)
  for (const file of input.files) form.append('files', file)
  const result = await httpClient.post<ApiResult<UploadTask>>(
    '/task/upload',
    form,
    // 上传耗时远大于普通请求，放开实例上 15 秒的默认超时
    { timeout: 0 },
  )
  return result.data
}

/** 删除数据文件元数据 */
export async function deleteFileMeta(id: string): Promise<void> {
  await httpClient.delete<ApiResult<unknown>>(
    '/filemeta/' + encodeURIComponent(id),
  )
}

/** 对数据文件发起处理任务（切片等） */
export async function processFileMeta(
  id: string,
  processingType: string,
): Promise<void> {
  await httpClient.post<ApiResult<unknown>>(
    '/filemeta/' + encodeURIComponent(id) + '/process',
    { processingType },
  )
}
