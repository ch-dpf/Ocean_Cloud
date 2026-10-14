/** 数据集记录 */
export interface GeoDataset {
  readonly id: string
  readonly dataSetCode: string
  readonly dataSetName: string
  readonly description: string
  readonly categoryId: string
  readonly fileCount: number
  readonly createTime: string
  readonly updateTime: string
}

/** 新增数据集的提交内容，记录 id 由后端生成 */
export interface DatasetCreateInput {
  readonly dataSetName: string
  readonly categoryId: number
  readonly description: string
}

/** 分页查询条件（/dataSet/page）；dataSetName 为名称模糊匹配关键字 */
export interface DatasetPageQuery {
  readonly current: number
  readonly size: number
  readonly categoryId?: number
  readonly dataSetName?: string
}

/** 数据集分页结果，分页字段由后端以字符串返回 */
export interface GeoDatasetPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly GeoDataset[]
}

/**
 * 修改数据集的提交内容：只允许改名称与描述。
 * 分类不可变更，但接口仍要求回传，因此按原值提交；
 * id 用列表接口返回的原始字符串，避免 int64 转数字丢精度。
 */
export interface DatasetUpdateInput {
  readonly id: string
  readonly dataSetName: string
  readonly categoryId: number
  readonly description: string
}
