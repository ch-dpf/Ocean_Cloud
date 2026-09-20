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

/** 文件操作类型名称（fileOpt 的 operationType）；未命中的取值按原样展示 */
export const OPERATION_TYPE_LABELS: Readonly<Record<string, string>> = {
  IMPORT: '导入',
  PROCESS: '处理',
  PUBLISH: '发布',
  EXPORT: '导出',
}

export function toOperationTypeLabel(type: string): string {
  return OPERATION_TYPE_LABELS[type] ?? type
}

/** 处理类型代号：目前只开放地形数据发起处理 */
export const PROCESSING_TYPE_TERRAIN = 'TERRAIN'
/** 处理类型代号：影像切片 */
export const PROCESSING_TYPE_IMAGERY = 'IMAGERY'
/** 处理类型代号：矢量切片 */
export const PROCESSING_TYPE_VECTOR = 'VECTOR'
/** 处理类型代号：海图切片（取值待后端确认） */
export const PROCESSING_TYPE_CHART = 'CHART'

/** 处理类型名称；未命中的取值按原样展示 */
export const PROCESSING_TYPE_LABELS: Readonly<Record<string, string>> = {
  [PROCESSING_TYPE_TERRAIN]: '地形处理',
  [PROCESSING_TYPE_IMAGERY]: '影像处理',
  [PROCESSING_TYPE_VECTOR]: '矢量处理',
}

export function toProcessingTypeLabel(type: string): string {
  return PROCESSING_TYPE_LABELS[type] ?? type
}

/**
 * 新建处理任务可选的切片类型：label 是界面文案，dataLabel 是选文件区的数据类型标题。
 * 四个取值与后端 processingType 一一对应；目前只开放地形切片，其余三项置灰。
 */
export const PROCESSING_TYPE_OPTIONS = [
  {
    value: PROCESSING_TYPE_TERRAIN,
    label: '地形切片',
    dataLabel: '地形',
    disabled: false,
  },
  {
    value: PROCESSING_TYPE_IMAGERY,
    label: '影像切片',
    dataLabel: '影像',
    disabled: true,
  },
  {
    value: PROCESSING_TYPE_VECTOR,
    label: '矢量切片',
    dataLabel: '矢量',
    disabled: true,
  },
  {
    value: PROCESSING_TYPE_CHART,
    label: '海图切片',
    dataLabel: '海图',
    disabled: true,
  },
] as const

/** 新建处理任务的预处理参数可选项：目前各只有一个取值，后端放开后再补 */
export const TARGET_CRS_OPTIONS = [{ value: 'EPSG:4326' }] as const

export const GEOTIFF_BLOCK_SIZE_OPTIONS = [{ value: '256' }] as const

export const TILE_PROFILE_OPTIONS = [
  { value: 'GEODETIC', label: '地理剖分（经纬度）' },
] as const

export const OUTPUT_FORMAT_OPTIONS = [
  { value: 'QUANTIZED_MESH', label: '.terrain（CesiumJS）' },
] as const
