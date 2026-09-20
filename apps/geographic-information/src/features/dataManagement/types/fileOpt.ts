/** 文件操作记录的筛选条件（/fileOpt/page）；值为空表示不按该条件筛选 */
export interface FileOptFilters {
  /** 数据集 id */
  readonly dataSetId?: string
  /** 分类 id */
  readonly categoryId?: number
  /** 记录编号 */
  readonly recordNo?: string
  /** 记录状态 */
  readonly recordStatus?: string
  /** 原始文件名 */
  readonly originalName?: string
  /** 扩展名（小写、不带点） */
  readonly extension?: string
  /** 创建时间起点，ISO-8601（2026-09-20T10:30:00） */
  readonly createTimeStart?: string
  /** 创建时间终点，ISO-8601 */
  readonly createTimeEnd?: string
}

export interface FileOptPageQuery extends FileOptFilters {
  /** 页码，1 为第一页 */
  readonly current: number
  /** 每页条数 */
  readonly size: number
}

/** 记录里附带的文件（详情接口的 files，列表接口里为 null） */
export interface FileOptFile {
  readonly id: string
  readonly categoryId: string
  readonly dataSetId: string
  readonly originalName: string
  readonly extension: string
  /** 字节数，后端以字符串返回 */
  readonly sizeBytes: string
  readonly sha256: string
  readonly storageKey: string
  readonly storageName: string
  readonly storageType: string
  readonly uploadStatus: string
  readonly cleanupStatus: string
  readonly uploadedBy: string | null
  readonly errorMessage: string | null
  readonly createTime: string
  readonly updateTime: string
}

/** 文件操作记录 */
export interface FileOptRecord {
  readonly id: string
  readonly recordNo: string
  /** 操作类型：IMPORT、PROCESS、PUBLISH、EXPORT */
  readonly operationType: string
  readonly dataSetId: string
  readonly dataSetName: string | null
  readonly categoryId: string
  readonly recordStatus: string
  readonly currentStage: string
  /** 进度百分比 */
  readonly progress: number
  readonly completedCount: number
  readonly failedCount: number
  readonly totalCount: number
  readonly startTime: string | null
  readonly finishTime: string | null
  readonly createTime: string
  readonly updateTime: string
  readonly errorMessage: string | null
  readonly operatorId: string | null
  readonly resultStorageKey: string | null
  readonly version: string
  readonly files: readonly FileOptFile[] | null
}

/** 分页结果，分页字段由后端以字符串返回 */
export interface FileOptPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly FileOptRecord[]
}
