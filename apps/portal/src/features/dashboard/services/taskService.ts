import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type { TaskPage, TaskPageQuery } from '../types/task'

/**
 * 分页查询任务。主平台 httpClient 的 baseURL 是 /api，
 * 业务接口在 /api/gis 下，因此这里需要带上 /gis 前缀。
 */
export async function getTaskPage(
  query: TaskPageQuery,
  signal?: AbortSignal,
): Promise<TaskPage> {
  const result = await httpClient.get<ApiResult<TaskPage>>('/gis/task/page', {
    params: {
      current: query.current,
      size: query.size,
      ...(query.taskStatus === undefined
        ? {}
        : { taskStatus: query.taskStatus }),
    },
    signal,
  })
  return result.data
}
