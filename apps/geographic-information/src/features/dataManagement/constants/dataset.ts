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

/** 侧边栏展示顺序：影像数据、矢量数据、地形数据、倾斜模型、电子海图 */
export const DATASET_CATEGORY_ORDER = [
  DATASET_CATEGORY_IDS.image,
  DATASET_CATEGORY_IDS.vector,
  DATASET_CATEGORY_IDS.terrain,
  DATASET_CATEGORY_IDS.obliqueModel,
  DATASET_CATEGORY_IDS.electronicChart,
] as const

/** 分页查询每页条数 */
export const DATASET_PAGE_SIZE = 10

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
