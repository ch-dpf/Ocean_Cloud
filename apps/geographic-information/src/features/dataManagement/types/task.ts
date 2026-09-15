/** 上传文件后由后端创建的处理任务 */
export interface UploadTask {
  readonly taskId: number
  readonly taskNo: string
  readonly dataSetId: number
  readonly totalCount: number
  readonly status: string
}

/** 任务分页查询参数（/api/gis/task/page） */
export interface TaskPageQuery {
  readonly current: number
  readonly size: number
  /** 任务类型：1-上传、2-切片、3-发布、4-导出或下载 */
  readonly taskType: string
  /** 任务状态；不传表示全部状态 */
  readonly taskStatus?: string
}

/** 任务记录（任务分页的 records 项） */
export interface TaskRecord {
  readonly id: string
  readonly taskNo: string
  readonly taskName: string
  readonly taskType: string
  readonly taskStatus: string
  readonly currentStage: string
  readonly dataSetId: string | null
  /** 处理类型：TERRAIN、IMAGERY、VECTOR */
  readonly processingType: string | null
  readonly completedCount: string
  readonly failedCount: string
  readonly totalCount: string
  readonly startTime: string | null
  readonly finishTime: string | null
  readonly createTime: string
  readonly updateTime: string
  readonly errorMessage: string | null
}

/** 任务分页结果 */
export interface TaskPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly TaskRecord[]
}
