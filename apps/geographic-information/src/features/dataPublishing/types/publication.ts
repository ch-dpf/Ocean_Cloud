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

/** 已发布的影像服务（/api/gis/imagery-publications/page 的 records 项） */
export interface ImageryPublication {
  readonly id: string
  readonly serviceCode: string
  readonly sourceTaskId: string | null
  readonly publishTaskId: string | null
  readonly dataSetId: string | null
  /** PUBLISHED 已发布 / DISABLED 已停用 */
  readonly status: string
  readonly targetCrs: string | null
  readonly tileProfile: string | null
  readonly outputFormat: string | null
  /** int32 层级，后端可能以字符串返回，使用方按需转换 */
  readonly minZoom: number | string | null
  readonly maxZoom: number | string | null
  /** 影像服务根 URL */
  readonly serviceUrl: string | null
  /** TileJSON 地址 */
  readonly tileJsonUrl: string | null
  /** XYZ 瓦片 URL 模板 */
  readonly tileUrlTemplate: string | null
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

/** 影像服务分页结果 */
export interface ImageryPublicationPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly ImageryPublication[]
}

/**
 * 聚合服务记录（/api/gis/publications/page）：地形与影像字段的并集。
 * 地形记录的影像专属字段为 null；区分类型的字段名后端尚未固定，
 * 因此把常见候选都列为可选，由归一化逻辑 detectKind 统一识别。
 */
export interface AllPublication {
  readonly id: string
  readonly serviceCode: string
  readonly sourceTaskId: string | null
  readonly publishTaskId: string | null
  readonly dataSetId: string | null
  /** PUBLISHED 已发布 / DISABLED 已停用 */
  readonly status: string
  /** 服务类型候选字段（实际以哪一个为准由后端决定） */
  readonly processingType?: string | null
  readonly serviceType?: string | null
  readonly publicationType?: string | null
  readonly type?: string | null
  // —— 影像专属，地形记录为 null ——
  readonly targetCrs?: string | null
  readonly tileProfile?: string | null
  readonly outputFormat?: string | null
  readonly minZoom?: number | string | null
  readonly maxZoom?: number | string | null
  readonly serviceUrl?: string | null
  readonly tileJsonUrl?: string | null
  readonly tileUrlTemplate?: string | null
  readonly publishTime?: string | null
  readonly updateTime: string
}

/** 聚合服务分页结果 */
export interface AllPublicationPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly AllPublication[]
}

export interface PublicationPageQuery {
  /** 页码，1 为第一页 */
  readonly current: number
  /** 每页条数 */
  readonly size: number
  /** 服务状态；不传表示不按状态筛选 */
  readonly status?: string
  /** 服务编号；不传表示不按编号筛选 */
  readonly serviceCode?: string
}

/** 数据发布页的查看范围：全部（地形+影像合并）/ 仅地形 / 仅影像 */
export type PublicationScope = 'all' | 'terrain' | 'imagery'

/**
 * 表格统一行：把地形、影像两类记录归一化后渲染。
 * 影像专属字段（targetCrs 等）在地形行上为 null，由表格按 scope 决定是否展示。
 */
export interface PublicationRow {
  /** 行唯一键 = kind + id，避免两类服务的自增 id 撞号 */
  readonly rowKey: string
  /** 服务类型：地形 / 影像 */
  readonly kind: Exclude<PublicationScope, 'all'>
  readonly id: string
  readonly serviceCode: string
  readonly sourceTaskId: string
  readonly publishTaskId: string
  readonly dataSetId: string
  readonly status: string
  readonly serviceUrl: string
  readonly publishTime: string | null
  readonly updateTime: string
  // —— 影像专属，地形行为 null ——
  readonly targetCrs: string | null
  readonly tileProfile: string | null
  readonly outputFormat: string | null
  readonly minZoom: number | null
  readonly maxZoom: number | null
}
