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

/** 列表筛选条件：值为空表示不按该条件筛选 */
export interface FileMetaFilters {
  /** 按原始文件名筛选 */
  readonly originalName?: string
  /** 按扩展名筛选，取值同列表里的数据格式列（小写、不带点） */
  readonly extension?: string
}

export interface FileMetaPageQuery extends FileMetaFilters {
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
