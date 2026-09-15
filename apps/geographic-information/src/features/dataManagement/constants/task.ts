/** 任务列表每页条数 */
export const TASK_PAGE_SIZE = 10

/** 任务类型：导入任务（/api/gis/task/page 的 taskType 参数） */
export const TASK_TYPE_IMPORT = '1'

/** 任务类型：切片（数据处理）任务 */
export const TASK_TYPE_PROCESS = '2'

/** 任务状态名称；未命中的取值按原样展示 */
export const TASK_STATUS_LABELS: Readonly<Record<string, string>> = {
  QUEUED: '排队中',
  RUNNING: '处理中',
  COMPLETED: '已完成',
  PARTIAL_FAILED: '部分失败',
  FAILED: '失败',
}

export function toTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status
}

/** 处理类型代号：目前只开放地形数据发起处理 */
export const PROCESSING_TYPE_TERRAIN = 'TERRAIN'

/** 处理类型名称；未命中的取值按原样展示 */
export const PROCESSING_TYPE_LABELS: Readonly<Record<string, string>> = {
  [PROCESSING_TYPE_TERRAIN]: '地形处理',
  IMAGERY: '影像处理',
  VECTOR: '矢量处理',
}

export function toProcessingTypeLabel(type: string): string {
  return PROCESSING_TYPE_LABELS[type] ?? type
}
