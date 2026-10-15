/**
 * 静态瓦片集成果包（/api/gis/tile-set-archives）。
 * 数字与计数类字段后端多以字符串返回，展示前统一用 Number() 转换。
 */
export interface TileSetArchive {
  readonly id: string
  readonly archiveNo: string
  readonly archiveName: string
  /** 归档格式，目前为 ZIP */
  readonly archiveFormat: string
  /** 归档状态：QUEUED 排队中 / RUNNING 处理中 / COMPLETED 已完成 / FAILED 失败 */
  readonly archiveStatus: string
  readonly currentStage: string
  /** 进度百分比 */
  readonly progress: number
  /** 归档包大小与已处理 / 总字节数，后端以字符串返回 */
  readonly archiveSizeBytes: string
  readonly processedBytes: string
  readonly totalBytes: string
  /** 已处理 / 总文件数，后端以字符串返回 */
  readonly processedFileCount: string
  readonly totalFileCount: string
  /** 下载次数，后端以字符串返回 */
  readonly downloadCount: string
  /** 后端判定当前是否可下载（归档未完成时为 false） */
  readonly downloadAvailable: boolean
  readonly lastDownloadTime: string | null
  readonly sha256: string
  /** 源处理任务 */
  readonly processingTaskId: string
  readonly processingType: string
  readonly taskName: string
  readonly taskNo: string
  readonly tileSetId: string
  readonly operatorId: string | null
  readonly errorMessage: string | null
  readonly version: string
  readonly startTime: string | null
  readonly finishTime: string | null
  readonly createTime: string
  readonly updateTime: string
}

/** 归档列表分页结果，分页字段由后端以字符串返回 */
export interface ArchivePage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly TileSetArchive[]
}
