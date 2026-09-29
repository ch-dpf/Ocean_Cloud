import { httpClient } from '../../../services/httpClient'
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

/** 导入任务创建结果（/filemeta/import/task 的 data）；taskId 是后端生成的字符串编号 */
interface ImportTaskCreated {
  readonly taskId: string
}

/**
 * 第一步：创建导入任务，dataSetId 与总文件数走 query，返回后端生成的 taskId。
 * 调用方拿到编号后先在「上传进度」里插入占位，再调 uploadImportBatch 传文件。
 * 进度不在响应里，由 /ws/task 长连接推送。
 */
export async function createImportTask(
  dataSetId: string,
  totalCount: number,
): Promise<string> {
  const result = await httpClient.post<ApiResult<ImportTaskCreated>>(
    '/filemeta/import/task',
    undefined,
    { params: { dataSetId, totalCount } },
  )
  return result.data.taskId
}

/** 第二步：按任务上传文件内容，多文件通过同一个 files 字段提交 */
export async function uploadImportBatch(
  taskId: string,
  files: readonly File[],
): Promise<void> {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  await httpClient.post<ApiResult<unknown>>(
    '/filemeta/import/batch/' + encodeURIComponent(taskId),
    form,
    // 上传耗时远大于普通请求，放开实例上 15 秒的默认超时
    { timeout: 0 },
  )
}

/** 删除数据文件元数据 */
export async function deleteFileMeta(id: string): Promise<void> {
  await httpClient.delete<ApiResult<unknown>>(
    '/filemeta/' + encodeURIComponent(id),
  )
}

/**
 * 下载数据文件内容：接口返回二进制流，由调用方保存为本地文件。
 * 下载耗时不可控，因此放开实例上 15 秒的默认超时。
 */
export async function downloadFileMeta(id: string): Promise<Blob> {
  return httpClient.get<Blob>(
    '/filemeta/' + encodeURIComponent(id) + '/download',
    { responseType: 'blob', timeout: 0 },
  )
}
