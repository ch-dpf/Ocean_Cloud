export type PublicationProcessingType = 'TERRAIN' | 'IMAGERY' | 'VECTOR'

/** 统一 GIS 发布记录（/api/gis/publications/page 的 records 项） */
export interface Publication {
  readonly id: string
  readonly serviceCode: string
  readonly processingType: PublicationProcessingType
  readonly tileSetId: string
  readonly sourceTaskId: string
  readonly dataSetId: string | null
  /** PUBLISHED 已发布 / DISABLED 已停用 */
  readonly status: string
  readonly outputKey: string
  readonly targetCrs: string | null
  readonly tileProfile: string | null
  readonly outputFormat: string | null
  readonly minZoom: number | string | null
  readonly maxZoom: number | string | null
  /** 服务访问根地址 */
  readonly serviceUrl: string
  /** 影像为 tilejson.json，地形为 layer.json */
  readonly descriptorUrl: string | null
  /** 影像瓦片模板；不适用的发布类型为 null */
  readonly tileUrlTemplate: string | null
  readonly publishTime: string | null
  readonly updateTime: string
}

/** 统一发布记录分页结果，分页字段由后端以字符串返回 */
export interface PublicationPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly Publication[]
}

export interface PublicationPageQuery {
  /** 页码，1 为第一页 */
  readonly current: number
  /** 每页条数 */
  readonly size: number
  /** 发布类型；不传表示全部类型 */
  readonly processingType?: PublicationProcessingType
  /** 服务状态；不传表示不按状态筛选 */
  readonly status?: string
  /** 服务编号；不传表示不按编号筛选 */
  readonly serviceCode?: string
}

/** 数据发布页的查看范围：全部（地形+影像）/ 仅地形 / 仅影像 */
export type PublicationScope = 'all' | 'terrain' | 'imagery'

export type PublicationKind = 'terrain' | 'imagery' | 'vector'

/** 发布表格行；协议专属字段在不适用时为 null。 */
export interface PublicationRow {
  readonly rowKey: string
  readonly kind: PublicationKind
  readonly id: string
  readonly serviceCode: string
  readonly sourceTaskId: string
  readonly dataSetId: string
  readonly status: string
  readonly serviceUrl: string
  readonly descriptorUrl: string
  readonly tileUrlTemplate: string
  readonly publishTime: string | null
  readonly updateTime: string
  readonly targetCrs: string | null
  readonly tileProfile: string | null
  readonly outputFormat: string | null
  readonly minZoom: number | null
  readonly maxZoom: number | null
}
