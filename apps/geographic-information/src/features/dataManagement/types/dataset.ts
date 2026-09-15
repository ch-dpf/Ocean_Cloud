/** 数据集记录 */
export interface GeoDataset {
  readonly id: string
  readonly dataSetCode: string
  readonly dataSetName: string
  readonly description: string
  readonly categoryId: string
  readonly fileCount: number
  readonly deleted: number
  readonly createTime: string
  readonly updateTime: string
}

/** 分页结果，分页字段由后端以字符串返回 */
export interface DatasetPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly GeoDataset[]
}

export interface DatasetPageQuery {
  /** 页码，1 为第一页 */
  readonly current: number
  /** 每页条数 */
  readonly size: number
  /** 数据集分类 id；不传表示不按分类筛选 */
  readonly categoryId?: number
  /** 数据集名称；不传表示不按名称筛选 */
  readonly dataSetName?: string
}

/** 新增数据集的提交内容，记录 id 由后端生成 */
export interface DatasetCreateInput {
  readonly dataSetName: string
  readonly categoryId: number
  readonly description: string
}
