/** 任务记录（/api/gis/task/page 的 records 项） */
export interface TaskRecord {
  readonly id: string
  readonly taskNo: string
  readonly taskName: string
  /** 任务状态：QUEUED、RUNNING、COMPLETED、PARTIAL_FAILED、FAILED */
  readonly taskStatus: string
  readonly currentStage: string
  readonly processingType: string | null
  readonly completedCount: string
  readonly failedCount: string
  readonly totalCount: string
  readonly errorMessage: string | null
  readonly startTime: string | null
  readonly finishTime: string | null
  readonly createTime: string
  readonly updateTime: string
}

/** 分页结果，分页字段由后端以字符串返回 */
export interface TaskPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly TaskRecord[]
}

export interface TaskPageQuery {
  /** 页码，1 为第一页 */
  readonly current: number
  /** 每页条数 */
  readonly size: number
  /** 任务状态；不传表示全部状态 */
  readonly taskStatus?: string
}
