import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'
import type {
  ProcessingParameters,
  TaskDetail,
  TaskPage,
  TaskPageQuery,
} from '../types/task'

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

/** 查询单个处理任务详情：taskId 即任务 id（int64，按字符串保留精度） */
export async function getTaskDetail(
  taskId: string,
  signal?: AbortSignal,
): Promise<TaskDetail> {
  const result = await httpClient.get<ApiResult<TaskDetail>>(
    '/task/' + encodeURIComponent(taskId),
    { signal },
  )
  return result.data
}

/**
 * 新建处理任务：multipart 提交，request 部分是 JSON，files 部分是待处理文件。
 * 上传耗时远大于普通请求，因此放开实例上 15 秒的默认超时。
 */
export async function createProcessingTask(input: {
  readonly processingType: string
  readonly taskName: string
  readonly parameters: ProcessingParameters
  readonly files: readonly File[]
}): Promise<void> {
  const form = new FormData()
  form.append(
    'request',
    // 带 type 才能让后端按 application/json 解析这一部分
    new Blob(
      [
        JSON.stringify({
          processingType: input.processingType,
          taskName: input.taskName,
          parameters: input.parameters,
        }),
      ],
      { type: 'application/json' },
    ),
  )
  for (const file of input.files) form.append('files', file)
  await httpClient.post<ApiResult<unknown>>('/task/process', form, {
    timeout: 0,
  })
}
