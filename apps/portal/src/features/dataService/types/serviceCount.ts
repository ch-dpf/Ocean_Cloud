/** 分页接口的公共返回：这里只关心 total，其余字段按需补充 */
export interface PageTotal {
  readonly current?: number | string
  readonly size?: number | string
  readonly total?: number | string
}
