/** 后端矢量图层及 GeoJSON 要素的接口契约，ID 保持字符串以避免精度丢失。 */
export interface VectorLayer {
  readonly layerId: string
  readonly dataSetId: string
  readonly sourceFileId: string
  readonly layerKey: string
  readonly layerName: string
  readonly status: string
  readonly featureCount: string | number
  readonly extent: unknown
  readonly geometryTypes: unknown
  readonly dataVersion: string | number
}

export interface VectorLayerPage {
  readonly current: string | number
  readonly size: string | number
  readonly total: string | number
  readonly records: readonly VectorLayer[]
}

export interface VectorGeometry {
  readonly type: string
  readonly coordinates?: unknown
  readonly geometries?: readonly VectorGeometry[]
}

export interface VectorFeature {
  readonly type: 'Feature'
  readonly id: string
  readonly layerId: string
  readonly geometry: VectorGeometry
  readonly properties: Record<string, unknown> | null
  readonly version: string | number
}

export interface VectorFeatureDraft {
  readonly type: 'Feature'
  readonly geometry: VectorGeometry
  readonly properties: Record<string, unknown> | null
}

export interface VectorFeatureCollection {
  readonly type: 'FeatureCollection'
  readonly features: readonly VectorFeature[]
  readonly numberReturned: number
  readonly hasMore: boolean
  readonly nextCursor: string | null
  readonly dataVersion: string | number
}
