import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  TransferPage,
  TransferPageQuery,
  TransferRecord,
} from '../types/fileTransfer'

/** 分页查询传输记录（上传导入 / 下载导出）；筛选条件为空时不提交该参数 */
export async function getTransferPage(
  query: TransferPageQuery,
  signal?: AbortSignal,
): Promise<TransferPage> {
  const result = await httpClient.get<ApiResult<TransferPage>>(
    '/file-transfer-records',
    {
      params: {
        current: query.current,
        size: query.size,
        ...(query.dataSetId ? { dataSetId: query.dataSetId } : {}),
        ...(query.categoryId === undefined
          ? {}
          : { categoryId: query.categoryId }),
        ...(query.recordNo ? { recordNo: query.recordNo } : {}),
        ...(query.operationType ? { operationType: query.operationType } : {}),
        ...(query.recordStatus ? { recordStatus: query.recordStatus } : {}),
        ...(query.originalName ? { originalName: query.originalName } : {}),
        ...(query.extension ? { extension: query.extension } : {}),
        ...(query.uploadStatus ? { uploadStatus: query.uploadStatus } : {}),
        ...(query.createTimeStart
          ? { createTimeStart: query.createTimeStart }
          : {}),
        ...(query.createTimeEnd ? { createTimeEnd: query.createTimeEnd } : {}),
      },
      signal,
    },
  )
  return result.data
}

/** 查询单条传输记录详情（含文件列表）；recordNo 走路径参数 */
export async function getTransferDetail(
  recordNo: string,
  signal?: AbortSignal,
): Promise<TransferRecord> {
  const result = await httpClient.get<ApiResult<TransferRecord>>(
    '/file-transfer-records/' + encodeURIComponent(recordNo),
    { signal },
  )
  return result.data
}
