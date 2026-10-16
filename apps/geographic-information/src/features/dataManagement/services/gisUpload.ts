import { httpClient } from '../../../services/httpClient'
import type { ApiResult } from '../../../services/apiResult'

const MiB = 1024 * 1024
const GiB = 1024 * MiB

/** 单个分片的最大重试次数（不含首次） */
const MAX_CHUNK_RETRIES = 3

/** 分片上传接口（/uploads/chunks）返回的 data */
export interface UploadChunkResult {
  readonly requestId: string
  readonly taskId: string
  readonly dataSetId: number
  readonly fileIndex: number
  /** 下一个分片的偏移；后端会写成字符串，用前必须转数字，见 toOffset */
  readonly nextOffset: number | string
  /** 该分片后端此前已收下（重试撞上已存分片时的正常情况） */
  readonly duplicate: boolean
  /** 仅表示字节传输结束，导入是否完成由任务状态决定。 */
  readonly fileCompleted: boolean
  readonly importCompleted: boolean
  readonly currentStage: string
  /** 后端已把该文件登记为失败：跳过它继续传下一个 */
  readonly fileFailed: boolean
  readonly taskCompleted: boolean
  readonly completedCount: number | string
  readonly failedCount: number | string
  readonly status: string
}

interface UploadGisFilesOptions {
  readonly dataSetId: string
  readonly files: readonly File[]
  /** 第一块上传成功、后端建好任务后回调，调用方据此插「上传中」占位 */
  readonly onTaskCreated?: (taskId: string) => void
  readonly onChunkResult?: (result: UploadChunkResult) => void
}

/** 分片大小：超大文件用更大的片，减少往返次数 */
function chooseChunkSize(file: File): number {
  return file.size > 2 * GiB ? 128 * MiB : 64 * MiB
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

/**
 * 上传偏移统一转成数字。后端把数字写成字符串是这套接口的常态（计数、偏移都是），
 * 不转的话 `offset + chunkSize` 会变成字符串拼接、slice 的结束位置超界，
 * 结果上传的是「文件剩余全部」而不是一个分片。转不出来则直接报错，避免静默少传。
 */
function toOffset(value: number | string): number {
  const offset = Number(value)
  if (!Number.isFinite(offset)) {
    throw new Error(`服务端返回的上传偏移无效：${String(value)}`)
  }
  return offset
}

/**
 * 请求编号：crypto.randomUUID 只在安全上下文（https 或 localhost）才有，
 * 用 http + 局域网 IP 打开页面时它是 undefined，因此这里退回时间戳 + 随机串。
 */
function createRequestId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/**
 * 上传单个分片，失败按 500ms × 2ⁿ 退避重试。
 * 重试可能撞上后端已经收下的分片，此时响应里的 duplicate 为 true，属正常情况。
 */
async function sendChunk(
  headers: Readonly<Record<string, string>>,
  chunk: Blob,
): Promise<UploadChunkResult> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_CHUNK_RETRIES; attempt += 1) {
    try {
      const result = await httpClient.post<ApiResult<UploadChunkResult>>(
        '/uploads/chunks',
        chunk,
        // 分片可能上百 MB，放开实例上 15 秒的默认超时
        { headers, timeout: 0 },
      )
      return result.data
    } catch (error) {
      lastError = error
      if (attempt < MAX_CHUNK_RETRIES) await sleep(500 * 2 ** attempt)
    }
  }
  throw lastError
}

/**
 * 分片上传一批 GIS 数据文件：按文件、按偏移逐块 POST /uploads/chunks，
 * 请求体是二进制分片，进度不在响应里、仍由 /ws/task 长连接推送。
 * 任务由后端在第一块上传时创建（响应里带 taskId），没有独立的建任务步骤。
 */
export async function uploadGisFiles(
  options: UploadGisFilesOptions,
): Promise<void> {
  const { dataSetId, files, onTaskCreated, onChunkResult } = options
  const requestId = createRequestId()
  const totalSize = files.reduce((sum, file) => sum + file.size, 0)
  let taskId: string | null = null

  for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
    const file = files[fileIndex]
    const chunkSize = chooseChunkSize(file)
    let offset = 0

    while (offset < file.size) {
      const currentChunkSize = Math.min(chunkSize, file.size - offset)
      const chunk = file.slice(offset, offset + currentChunkSize)
      const headers: Record<string, string> = {
        'Content-Type': 'application/octet-stream',
        'Upload-Request-Id': requestId,
        'Upload-Data-Set-Id': String(dataSetId),
        'Upload-File-Index': String(fileIndex),
        'Upload-File-Count': String(files.length),
        // 后端按 UTF-8 URL 编码解码文件名
        'Upload-File-Name': encodeURIComponent(file.name),
        'Upload-File-Size': String(file.size),
        'Upload-Total-Size': String(totalSize),
        'Upload-Offset': String(offset),
        'Upload-Chunk-Size': String(currentChunkSize),
      }

      const result = await sendChunk(headers, chunk)

      // 第一块成功后后端才给出任务编号，此时插占位让进度列表立刻有这一条
      if (taskId === null) {
        taskId = result.taskId
        onTaskCreated?.(result.taskId)
      }

      onChunkResult?.(result)

      // 后端已登记该文件失败：跳到下一个文件，不再纠结偏移
      if (result.fileFailed) break

      // 偏移没推进又没说文件传完，继续循环只会原地打转
      const nextOffset = toOffset(result.nextOffset)
      if (nextOffset <= offset && !result.fileCompleted) {
        throw new Error(`服务端未推进上传偏移：${offset} -> ${nextOffset}`)
      }

      offset = nextOffset
      if (result.fileCompleted) break
    }
  }
}
