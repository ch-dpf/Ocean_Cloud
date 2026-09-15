/** 已发布的地形服务（/api/gis/terrain-publications/page 的 records 项） */
export interface TerrainPublication {
  readonly id: string
  readonly serviceCode: string
  readonly sourceTaskId: string | null
  readonly publishTaskId: string | null
  readonly dataSetId: string | null
  /** PUBLISHED 已发布 / DISABLED 已停用 */
  readonly status: string
  /** CesiumTerrainProvider 使用的服务根 URL */
  readonly serviceUrl: string
  readonly publishTime: string | null
  readonly updateTime: string
}

/** 分页结果，分页字段由后端以字符串返回 */
export interface PublicationPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly TerrainPublication[]
}

export interface PublicationPageQuery {
  /** 页码，1 为第一页 */
  readonly current: number
  /** 每页条数 */
  readonly size: number
  /** 服务状态；不传表示不按状态筛选 */
  readonly status?: string
}
