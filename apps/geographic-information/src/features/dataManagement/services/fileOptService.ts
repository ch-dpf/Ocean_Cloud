import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  FileOptPage,
  FileOptPageQuery,
  FileOptRecord,
} from '../types/fileOpt'

/** 分页查询文件操作记录（导入记录）；筛选条件为空时不提交该参数 */
export async function getFileOptPage(
  query: FileOptPageQuery,
  signal?: AbortSignal,
): Promise<FileOptPage> {
  const result = await httpClient.get<ApiResult<FileOptPage>>('/fileOpt/page', {
    params: {
      current: query.current,
      size: query.size,
      ...(query.dataSetId ? { dataSetId: query.dataSetId } : {}),
      ...(query.categoryId === undefined
        ? {}
        : { categoryId: query.categoryId }),
      ...(query.recordNo ? { recordNo: query.recordNo } : {}),
      ...(query.recordStatus ? { recordStatus: query.recordStatus } : {}),
      ...(query.originalName ? { originalName: query.originalName } : {}),
      ...(query.extension ? { extension: query.extension } : {}),
      ...(query.createTimeStart
        ? { createTimeStart: query.createTimeStart }
        : {}),
      ...(query.createTimeEnd ? { createTimeEnd: query.createTimeEnd } : {}),
    },
    signal,
  })
  return result.data
}

/** 查询单条记录详情（含文件列表）；recordNo 走路径参数 */
export async function getFileOptDetail(
  recordNo: string,
  signal?: AbortSignal,
): Promise<FileOptRecord> {
  const result = await httpClient.get<ApiResult<FileOptRecord>>(
    '/fileOpt/' + encodeURIComponent(recordNo),
    { signal },
  )
  return result.data
}
