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

/** 管理数据切片任务的提交内容（/api/gis/task/process-managed） */
export interface ManagedProcessInput {
  readonly processingType: string
  readonly taskName: string
  readonly parameters: ProcessingParameters
  readonly fileMetaIds: readonly string[]
}

/**
 * 手工拼 process-managed 的 JSON 文本：fileMetaIds 是 int64，超出 JS 安全整数范围
 * （如 2102310764629557250），转 Number 会改写末位，因此把原字符串直接写进 JSON 数组；
 * 非纯数字的 id 退回带引号的字符串，保证 body 始终是合法 JSON。
 * parameters 只含字符串与布尔值，JSON.stringify 即可。
 */
function serializeManagedProcess(input: ManagedProcessInput): string {
  const ids = input.fileMetaIds
    .map((id) => (/^\d+$/.test(id) ? id : JSON.stringify(id)))
    .join(',')
  const body =
    `{"processingType":${JSON.stringify(input.processingType)},` +
    `"taskName":${JSON.stringify(input.taskName)},` +
    `"fileMetaIds":[${ids}],` +
    `"parameters":${JSON.stringify(input.parameters)}}`
  return body
}

/** 提交已管理文件的切片任务：只带文件标识，不上传文件内容 */
export async function createManagedProcessingTask(
  input: ManagedProcessInput,
): Promise<void> {
  await httpClient.post<ApiResult<unknown>>(
    '/task/process-managed',
    serializeManagedProcess(input),
    { headers: { 'Content-Type': 'application/json' } },
  )
}

/** 服务器文件切片任务的提交内容（/api/gis/task/process-workspace） */
export interface WorkspaceProcessInput {
  readonly processingType: string
  readonly taskName: string
  readonly parameters: ProcessingParameters
  /** 工作区内的相对路径，待处理的文件由后端按该路径解析 */
  readonly relativePath: string
}

/** 服务器文件所在的工作区：接口要求该字段，暂时固定为 default */
const WORKSPACE_CODE = 'default'

/**
 * 提交服务器文件（工作区）的切片任务：只带相对路径，不上传文件内容。
 * 字段都是字符串与对象，没有 int64，直接交给 httpClient 序列化即可。
 */
export async function createWorkspaceProcessingTask(
  input: WorkspaceProcessInput,
): Promise<void> {
  await httpClient.post<ApiResult<unknown>>('/task/process-workspace', {
    processingType: input.processingType,
    taskName: input.taskName,
    workspaceCode: WORKSPACE_CODE,
    relativePath: input.relativePath,
    parameters: input.parameters,
  })
}
