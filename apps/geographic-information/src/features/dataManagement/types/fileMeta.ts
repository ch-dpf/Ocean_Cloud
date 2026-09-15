/** 数据文件元数据 */
export interface FileMeta {
  readonly id: string
  readonly dataSetId: string
  readonly categoryId: string
  readonly originalName: string
  readonly extension: string
  readonly sizeBytes: string
  readonly sha256: string
  readonly storageKey: string
  readonly storageName: string
  readonly storageType: string
  readonly taskId: string
  readonly uploadStatus: string
  readonly uploadedBy: string | null
  readonly errorMessage: string | null
  readonly createTime: string
  readonly updateTime: string
}

/** 分页结果，分页字段由后端以字符串返回 */
export interface FileMetaPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly FileMeta[]
}

export interface FileMetaPageQuery {
  /** 页码，1 为第一页 */
  readonly current: number
  /** 每页条数 */
  readonly size: number
  /** 按数据集筛选 */
  readonly dataSetId?: string
  /** 按分类筛选 */
  readonly categoryId?: number
}

/** 文件列表的查询范围；传入 null 表示当前不查询 */
export type FileScope =
  | { readonly kind: 'all' }
  | { readonly kind: 'category'; readonly categoryId: number }
  | { readonly kind: 'dataset'; readonly dataSetId: string }
  | { readonly kind: 'recycleBin' }
