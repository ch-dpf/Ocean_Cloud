import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type { TaskPage, TaskPageQuery } from '../types/task'

/** 分页查询任务（导入记录） */
export async function getTaskPage(
  query: TaskPageQuery,
  signal?: AbortSignal,
): Promise<TaskPage> {
  const result = await httpClient.get<ApiResult<TaskPage>>('/task/page', {
    params: query,
    signal,
  })
  return result.data
}
