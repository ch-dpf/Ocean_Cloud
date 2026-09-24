/** 处理任务的预处理参数（/api/gis/task/process 的 request.parameters） */
export interface ProcessingParameters {
  /** 目标坐标系，地形 EPSG:4326，影像 EPSG:3857 */
  readonly targetCrs: string
  /** 瓦片切分剖面 / 服务格式，地形 GEODETIC，影像 XYZ */
  readonly tileProfile: string
  /** 输出格式 / 发布类型，地形 QUANTIZED_MESH，影像 PNG */
  readonly outputFormat: string
  /** 影像切片固定参数：最小层级 */
  readonly minZoom?: number
  /** 影像切片固定参数：重采样方式 */
  readonly resampling?: string
  /** 影像切片固定参数：是否透明 */
  readonly transparent?: boolean
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
  /** 数据传入方式：FILE、URL */
  readonly sourceType: string | null
}

/** 任务分页结果 */
export interface TaskPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly TaskRecord[]
}

/** 任务详情里的处理参数（/task/{taskId} 的 parameters；未使用的字段为 null） */
export interface TaskDetailParameters {
  readonly targetCrs: string | null
  readonly tileProfile: string | null
  readonly outputFormat: string | null
  readonly minZoom: number | string | null
  readonly maxZoom: number | string | null
  readonly resampling: string | null
  readonly transparent: boolean | null
}

/** 任务的输入项（文件 / 工作区文件等） */
export interface TaskInput {
  readonly id: string
  readonly sequenceNo: number
  /** 输入类型：FILE 等 */
  readonly inputKind: string
  /** 输入状态：CONSUMED 等 */
  readonly inputStatus: string
  readonly fileMetaId: string | null
  readonly workspaceCode: string | null
  readonly relativePath: string | null
  readonly storageKey: string | null
  readonly originalName: string | null
  readonly extension: string | null
  /** 字节数，后端以字符串返回 */
  readonly sizeBytes: string | null
  readonly sha256: string | null
  readonly errorMessage: string | null
  readonly createTime: string | null
  readonly updateTime: string | null
}

/** 任务详情里的任务主体（计数与时间字段由后端以字符串返回） */
export interface TaskDetailInfo {
  readonly id: string
  readonly taskNo: string
  readonly taskName: string
  readonly processingType: string | null
  readonly taskStatus: string
  readonly currentStage: string | null
  readonly sourceType: string | null
  readonly priority: number | null
  readonly completedCount: string
  readonly failedCount: string
  readonly totalCount: string
  readonly startTime: string | null
  readonly finishTime: string | null
  readonly errorMessage: string | null
  readonly createTime: string
  readonly updateTime: string
}

/** 任务产出的瓦片集（任务未产出时后端可能返回 null） */
export interface TaskTileSet {
  readonly id: string
  readonly tileType: string | null
  readonly tileSetStatus: string | null
  readonly outputKey: string | null
  readonly targetCrs: string | null
  readonly tileProfile: string | null
  readonly outputFormat: string | null
  readonly minZoom: number | string | null
  readonly maxZoom: number | string | null
  readonly manifestKey: string | null
  readonly errorMessage: string | null
  readonly createTime: string | null
  readonly updateTime: string | null
}

/** 任务详情（/api/gis/task/{taskId} 的 data） */
export interface TaskDetail {
  readonly task: TaskDetailInfo
  readonly inputs: readonly TaskInput[]
  readonly parameters: TaskDetailParameters | null
  readonly parameterSchemaVersion: number | null
  readonly requestFingerprint: string | null
  readonly tileSet: TaskTileSet | null
}
