import { toTaskStatusLabel } from '../../dataManagement/constants/task'

/** 归档列表每页条数 */
export const ARCHIVE_PAGE_SIZE = 10

/**
 * 归档任务的 WS 帧类型：帧里的 taskId 就是归档编号（archiveNo），
 * 因此可以直接按 archiveNo 把实时进度并进列表行
 */
export const ARCHIVE_TASK_KINDS = ['GIS_TILE_SET_ARCHIVE'] as const

/**
 * 归档状态与任务状态共用同一套文案（QUEUED 排队中 / RUNNING 处理中 /
 * COMPLETED 已完成 / FAILED 失败），直接复用 toTaskStatusLabel。
 * 包一层是为了标明这层映射是归档列表的约定，后端若改枚举只需改这里。
 */
export { toTaskStatusLabel as toArchiveStatusLabel }

/** 可重试的归档状态：归档只有失败一种终态失败，失败后允许重试 */
export const RETRYABLE_ARCHIVE_STATUSES: readonly string[] = ['FAILED']

export function canRetryArchive(archiveStatus: string): boolean {
  return RETRYABLE_ARCHIVE_STATUSES.includes(archiveStatus)
}
