/** 数据集分类：categoryId 与业务名称的对应关系 */
export const DATASET_CATEGORY_LABELS: Readonly<Record<number, string>> = {
  0: '影像数据',
  1: '地形数据',
  2: '矢量数据',
  3: '倾斜模型',
  4: '电子海图',
}

/** 数据集分类代号 */
export const DATASET_CATEGORY_IDS = {
  image: 0,
  terrain: 1,
  vector: 2,
  obliqueModel: 3,
  electronicChart: 4,
} as const

/** 侧边栏展示顺序：影像数据、地形数据、矢量数据、倾斜模型、电子海图 */
export const DATASET_CATEGORY_ORDER = [
  DATASET_CATEGORY_IDS.image,
  DATASET_CATEGORY_IDS.terrain,
  DATASET_CATEGORY_IDS.vector,
  DATASET_CATEGORY_IDS.obliqueModel,
  DATASET_CATEGORY_IDS.electronicChart,
] as const

/** 分页查询每页条数 */
export const DATASET_PAGE_SIZE = 10

/**
 * 卡片墙每页条数：11 条数据集 + 首个固定的「新增」卡片 = 12 格，
 * 一行 4 个时正好铺满 3 行，翻页不会出现半行
 */
export const DATASET_CARD_PAGE_SIZE = 11

/** 取数据集轮廓时的简化容差：详情弹窗要看完整范围，按后端要求传 0（不简化） */
export const FOOTPRINT_SIMPLIFY_TOLERANCE = 0

/**
 * 处理类型名称：由分类名推出（影像数据 → 影像处理、倾斜模型 → 倾斜模型处理）。
 * 从同一份分类映射推导，避免再维护第二份键值对。
 */
export function toProcessLabel(categoryId: number): string {
  const label = DATASET_CATEGORY_LABELS[categoryId]
  return label ? label.replace(/数据$/, '') + '处理' : ''
}

/** 数据文件分页查询每页条数 */
export const FILE_PAGE_SIZE = 10

/** 传输记录分页查询每页条数 */
export const TRANSFER_PAGE_SIZE = 10

/**
 * 「数据格式」筛选项：值即后端 extension 字段（小写、不带点），与列表里的数据格式列一致。
 * 常见格式先在此枚举，后续按实际入库的格式增补。
 */
export const FILE_FORMAT_OPTIONS = [
  'tif',
  'tiff',
  'img',
  'dem',
  'asc',
  'shp',
  'geojson',
  'kml',
  'kmz',
  'gdb',
  'dwg',
  'dxf',
  'las',
  'laz',
  'osgb',
  'obj',
  'zip',
] as const

export const METADATA_STATUS_LABELS: Readonly<Record<string, string>> = {
  QUEUED: '待提取',
  RUNNING: '提取中',
  COMPLETED: '可用',
  FAILED: '提取失败',
  NOT_APPLICABLE: '配套附件',
}

export const METADATA_STATUS_OPTIONS = Object.entries(
  METADATA_STATUS_LABELS,
).map(([value, label]) => ({ value, label }))
