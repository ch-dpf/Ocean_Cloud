/** 系统异常日志 */
export interface SysExceptionLog {
  readonly id: string
  readonly exceptionType: string
  readonly exceptionMessage: string
  readonly requestUrl: string
  readonly requestMethod: string
  readonly requestParams: string | null
  readonly userId: string | null
  readonly username: string | null
  readonly ipAddress: string | null
  readonly classMethod: string | null
  readonly lineNumber: number | null
  readonly stackTrace: string | null
  /** 处理状态：0-未处理，1-已处理 */
  readonly status: number
  readonly handleRemark: string | null
  readonly handleTime: string | null
  readonly handleUser: string | null
  readonly createTime: string
}

/** 系统操作日志 */
export interface SysOperationLog {
  readonly id: string
  readonly userId: string | null
  readonly username: string | null
  readonly module: string
  readonly operationType: string
  readonly description: string
  readonly method: string | null
  readonly requestUrl: string
  readonly requestMethod: string
  readonly requestParams: string | null
  readonly responseResult: string | null
  readonly ipAddress: string | null
  readonly userAgent: string | null
  /** 执行时长（毫秒） */
  readonly executionTime: number | null
  /** 状态：0-失败，1-成功 */
  readonly status: number
  readonly errorMessage: string | null
  readonly createTime: string
}

/** 系统登录日志 */
export interface SysLoginLog {
  readonly id: string
  readonly userId: string | null
  readonly username: string | null
  readonly loginType: string | null
  readonly ipAddress: string | null
  readonly location: string | null
  readonly browser: string | null
  readonly os: string | null
  readonly userAgent: string | null
  readonly deviceId: string | null
  readonly platform: string | null
  /** 状态：0-失败，1-成功 */
  readonly status: number
  /** 提示信息 */
  readonly message: string | null
  readonly loginTime: string
  readonly logoutTime: string | null
  readonly sessionId: string | null
}

/** 分页结果，分页字段由后端以字符串返回 */
export interface LogPage<T> {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly T[]
}

/** 三个日志接口共用的查询参数 */
export interface LogQueryParams {
  /** 页码，1 为第一页 */
  readonly current: number
  /** 每页条数 */
  readonly size: number
  readonly username?: string
  /** 开始时间，格式 yyyy-MM-dd HH:mm:ss */
  readonly startTime?: string
  /** 结束时间，格式 yyyy-MM-dd HH:mm:ss */
  readonly endTime?: string
  readonly status?: number
}
