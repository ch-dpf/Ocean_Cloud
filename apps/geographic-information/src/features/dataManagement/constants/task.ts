/** 导入记录每页条数 */
export const TASK_PAGE_SIZE = 10

/** 任务类型：导入任务（/api/gis/task/page 的 taskType 参数） */
export const TASK_TYPE_IMPORT = '1'

/** 任务状态名称；未命中的取值按原样展示 */
const TASK_STATUS_LABELS: Readonly<Record<string, string>> = {
  COMPLETED: '已完成',
  RUNNING: '进行中',
  FAILED: '失败',
  PENDING: '等待中',
}

export function toTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status
}
