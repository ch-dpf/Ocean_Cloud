import { DATASET_CATEGORY_IDS } from './dataset'

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

/**
 * /ws/task 的帧按任务类型前缀分流：
 * 导入任务的帧进「上传进度」，三类处理任务的帧进「处理进度」。
 */
export const UPLOAD_TASK_KINDS = ['GIS_IMPORT'] as const

export const PROCESSING_TASK_KINDS = [
  'GIS_TERRAIN',
  'GIS_IMAGERY',
  'GIS_VECTOR',
] as const

export function toTaskStatusLabel(status: string): string {
  return TASK_STATUS_LABELS[status] ?? status
}

/** 任务输入项类型（inputs[].inputKind）；未命中的取值按原样展示 */
export const INPUT_KIND_LABELS: Readonly<Record<string, string>> = {
  FILE: '文件',
}

export function toInputKindLabel(kind: string): string {
  return INPUT_KIND_LABELS[kind] ?? kind
}

/** 任务输入项状态（inputs[].inputStatus）；未命中的取值按原样展示 */
export const INPUT_STATUS_LABELS: Readonly<Record<string, string>> = {
  PENDING: '待处理',
  CONSUMED: '已消费',
  FAILED: '失败',
  SKIPPED: '已跳过',
}

export function toInputStatusLabel(status: string): string {
  return INPUT_STATUS_LABELS[status] ?? status
}

/** 瓦片集状态（tileSet.tileSetStatus）；未命中的取值按原样展示 */
export const TILE_SET_STATUS_LABELS: Readonly<Record<string, string>> = {
  PENDING: '待生成',
  GENERATING: '生成中',
  READY: '就绪',
  FAILED: '失败',
}

export function toTileSetStatusLabel(status: string): string {
  return TILE_SET_STATUS_LABELS[status] ?? status
}

/** 数据接入方式（task.sourceType）；未命中的取值按原样展示 */
export const SOURCE_TYPE_LABELS: Readonly<Record<string, string>> = {
  MANAGED_FILE: '本地文件',
  FILE: '文件',
  URL: '链接',
}

export function toSourceTypeLabel(type: string): string {
  return SOURCE_TYPE_LABELS[type] ?? type
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
 * 四个取值与后端 processingType 一一对应；目前开放地形切片与影像切片，矢量与海图置灰。
 */
export const PROCESSING_TYPE_OPTIONS = [
  {
    value: PROCESSING_TYPE_TERRAIN,
    label: '地形切片',
    dataLabel: '文件上传',
    disabled: false,
  },
  {
    value: PROCESSING_TYPE_IMAGERY,
    label: '影像切片',
    dataLabel: '文件上传',
    disabled: false,
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

/**
 * 预处理参数可选项：影像可在后端允许的取值里选，每项第一项是推荐默认值；
 * 地形暂只放开推荐取值，后端允许的其他候选值界面不给切。
 */
export const TARGET_CRS_OPTIONS = [{ value: 'EPSG:4326' }] as const

export const TILE_PROFILE_OPTIONS = [{ value: 'TMS' }] as const

export const OUTPUT_FORMAT_OPTIONS = [
  { value: 'QUANTIZED_MESH', label: '.terrain' },
] as const

export const IMAGERY_TARGET_CRS_OPTIONS = [
  { value: 'EPSG:4326' },
  { value: 'EPSG:3857' },
] as const

export const IMAGERY_TILE_PROFILE_OPTIONS = [
  { value: 'XYZ' },
  { value: 'TMS' },
] as const

export const IMAGERY_OUTPUT_FORMAT_OPTIONS = [
  { value: 'PNG' },
  { value: 'JPEG' },
  { value: 'JPG' },
] as const

/**
 * 分类对应的处理类型：数据管理页按文件分类锁定处理类型，
 * 未列出的分类（矢量、倾斜模型、电子海图）暂不开放处理。
 */
export const CATEGORY_PROCESSING_TYPES: Readonly<Record<number, string>> = {
  [DATASET_CATEGORY_IDS.image]: PROCESSING_TYPE_IMAGERY,
  [DATASET_CATEGORY_IDS.terrain]: PROCESSING_TYPE_TERRAIN,
}

/** 处理类型对应的数据分类：数据管理数据页签按此过滤可选文件 */
export function toCategoryOfProcessingType(
  processingType: string,
): number | undefined {
  const found = Object.entries(CATEGORY_PROCESSING_TYPES).find(
    ([, type]) => type === processingType,
  )
  return found === undefined ? undefined : Number(found[0])
}
