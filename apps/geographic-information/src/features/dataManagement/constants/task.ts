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
 * 分片上传（导入）任务的帧进「上传进度」，三类处理任务的帧进「处理进度」。
 */
export const UPLOAD_TASK_KINDS = ['GIS_UPLOAD'] as const

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
  PENDING: '处理中',
  CONSUMED: '已处理',
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

/** 传输类型代号：上传导入 */
export const OPERATION_TYPE_IMPORT = 'IMPORT'
/** 传输类型代号：下载导出 */
export const OPERATION_TYPE_EXPORT = 'EXPORT'

/**
 * 传输类型名称（file-transfer-records 的 operationType）；未命中的取值按原样展示。
 * 该接口只定义 IMPORT / EXPORT 两种，其余取值走 toOperationTypeLabel 的兜底
 */
export const OPERATION_TYPE_LABELS: Readonly<Record<string, string>> = {
  [OPERATION_TYPE_IMPORT]: '上传导入',
  [OPERATION_TYPE_EXPORT]: '下载导出',
}

/** 传输记录搜索栏的类型下拉选项 */
export const OPERATION_TYPE_OPTIONS = [
  {
    value: OPERATION_TYPE_IMPORT,
    label: OPERATION_TYPE_LABELS[OPERATION_TYPE_IMPORT],
  },
  {
    value: OPERATION_TYPE_EXPORT,
    label: OPERATION_TYPE_LABELS[OPERATION_TYPE_EXPORT],
  },
] as const

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
  { value: 'EPSG:3857' },
  { value: 'EPSG:4326' },
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

/** 处理阶段中文名（帧里 currentStage.code）；未命中的取值按原样展示 */
export const PROCESSING_STAGE_LABELS: Readonly<Record<string, string>> = {
  preparing: '准备中',
  analyzing: '分析中',
  preprocessing: '预处理中',
  processing: '处理中',
  generating: '生成中',
  finalizing: '收尾中',
  storing: '存储中',
}

export function toProcessingStageLabel(code: string): string {
  return PROCESSING_STAGE_LABELS[code] ?? code
}

/**
 * 各处理任务的阶段推进顺序（帧里 currentStage.code）：影像有准备阶段、
 * 地形有预处理阶段，用于在进度条上方展示「第几阶段 / 共几阶段」。
 */
export const PROCESSING_STAGE_ORDERS: Readonly<
  Record<string, readonly string[]>
> = {
  [PROCESSING_TYPE_IMAGERY]: [
    'preparing',
    'analyzing',
    'generating',
    'finalizing',
  ],
  [PROCESSING_TYPE_TERRAIN]: [
    'analyzing',
    'preprocessing',
    'generating',
    'finalizing',
  ],
}

/** 阶段序号文案（如 2/4）；阶段不在该处理类型的顺序里时返回空串 */
export function toProcessingStageIndex(
  processingType: string,
  stageCode: string,
): string {
  const order = PROCESSING_STAGE_ORDERS[processingType]
  if (order === undefined || stageCode === '') return ''
  const index = order.indexOf(stageCode)
  return index === -1 ? '' : `${index + 1}/${order.length}`
}

/**
 * WS 帧里的任务类型形如 GIS_IMAGERY，去掉 GIS_ 前缀就是处理类型 IMAGERY；
 * 分片上传任务是 GIS_UPLOAD，没有对应的处理阶段。
 */
export function toProcessingTypeOfKind(kind: string): string {
  return kind.startsWith('GIS_') ? kind.slice(4) : kind
}
