/** 后端空间元数据提取状态。 */
export type MetadataStatus =
  'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NOT_APPLICABLE'
export type SpatialRelation = 'INTERSECTS' | 'COVERED_BY'
export type ApiNumber = number | string
export type TileMatrixSetId = 'WebMercatorQuad' | 'WorldCRS84Quad'

export interface GeographicBounds {
  readonly west: number
  readonly north: number
  readonly east: number
  readonly south: number
}

/** 一个文件图层的源空间参考与检索范围。 */
export interface SpatialReference {
  readonly layerKey: string
  readonly layerName: string | null
  readonly dataKind: 'RASTER' | 'VECTOR'
  readonly sourceCrsCode: string | null
  readonly sourceCrsWkt: string
  readonly sourceUnit: string | null
  readonly sourceExtent: Readonly<Record<string, unknown>>
  readonly geographicExtent: string | null
  readonly extentKind: 'RASTER_FOOTPRINT' | 'VECTOR_ENVELOPE'
  readonly west: ApiNumber
  readonly south: ApiNumber
  readonly east: ApiNumber
  readonly north: ApiNumber
  readonly rasterWidth: ApiNumber | null
  readonly rasterHeight: ApiNumber | null
  readonly bandCount: ApiNumber | null
  readonly resolutionX: ApiNumber | null
  readonly resolutionY: ApiNumber | null
  readonly resolutionUnit: string | null
  readonly tileMatrixSetId: string | null
  readonly tileWidth: ApiNumber | null
  readonly tileHeight: ApiNumber | null
  readonly recommendedMaxZoom: ApiNumber | null
  readonly calculationDetails: Readonly<Record<string, unknown>>
  readonly extraMetadata: Readonly<Record<string, unknown>>
}

/** 数据文件元数据；长整型标识和计数按后端序列化契约使用字符串。 */
export interface FileMeta {
  readonly id: string
  readonly dataSetId: string
  readonly categoryId: string
  readonly originalName: string
  readonly extension: string
  readonly sizeBytes: string
  readonly sha256: string | null
  readonly storageKey: string
  readonly storageName: string
  readonly storageType: string
  readonly uploadStatus: string
  readonly uploadedBy: string | null
  readonly errorMessage: string | null
  readonly metadataStatus: MetadataStatus
  readonly metadataVersion: ApiNumber
  readonly metadataErrorCode: string | null
  readonly metadataErrorMessage: string | null
  readonly metadataExtractedAt: string | null
  readonly spatialReferences: readonly SpatialReference[]
  readonly createTime: string
  readonly updateTime: string
}

export interface FileMetaPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly FileMeta[]
}

/** 未指定元数据状态时，正常列表由后端只返回可用数据。 */
export interface FileMetaFilters {
  readonly originalName?: string
  readonly extension?: string
  readonly metadataStatus?: MetadataStatus
  readonly west?: number
  readonly north?: number
  readonly east?: number
  readonly south?: number
  readonly spatialRelation?: SpatialRelation
  readonly requiredZoom?: number
  readonly tileMatrixSetId?: TileMatrixSetId
  readonly includeGeometry?: boolean
}

export interface FileMetaPageQuery extends FileMetaFilters {
  readonly current: number
  readonly size: number
  readonly dataSetId?: string
  readonly categoryId?: number
}

export type FileScope =
  | { readonly kind: 'all' }
  | { readonly kind: 'category'; readonly categoryId: number }
  | { readonly kind: 'dataset'; readonly dataSetId: string }
  | { readonly kind: 'recycleBin' }
