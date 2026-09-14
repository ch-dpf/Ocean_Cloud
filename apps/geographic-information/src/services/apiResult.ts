/** 业务接口统一响应体 */
export interface ApiResult<T> {
  readonly code: number
  readonly message: string
  readonly data: T
}
