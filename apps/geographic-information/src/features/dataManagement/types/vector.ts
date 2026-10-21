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

export interface VectorFeatureCollection {
  readonly type: 'FeatureCollection'
  readonly features: readonly VectorFeature[]
  readonly numberReturned: number
  readonly hasMore: boolean
  readonly nextCursor: string | null
  readonly dataVersion: string | number
}

export type VectorGeometryType = 'POINT' | 'LINE' | 'POLYGON'
export type VectorScalar = string | number | boolean | null
export type VectorFilter =
  | { readonly op: 'and' | 'or'; readonly conditions: readonly VectorFilter[] }
  | {
      readonly op: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'exists'
      readonly field: string
      readonly value?: VectorScalar | readonly VectorScalar[]
    }

export interface VectorSymbol {
  readonly color?: string
  readonly radius?: number
  readonly width?: number
  readonly opacity?: number
  readonly fillColor?: string
  readonly fillOpacity?: number
  readonly strokeColor?: string
  readonly strokeWidth?: number
  readonly strokeOpacity?: number
}

export interface VectorStyleRule {
  readonly id: string
  readonly geometryType: VectorGeometryType
  readonly minZoom?: number | null
  readonly maxZoom?: number | null
  readonly filter?: VectorFilter | null
  readonly visible?: boolean
  readonly symbol?: VectorSymbol | null
}

export interface VectorStyleDefinition {
  readonly schemaVersion: 1
  readonly rules: readonly VectorStyleRule[]
}

export interface VectorStyleSummary {
  readonly styleId: string
  readonly layerId: string
  readonly name: string
  readonly isDefault: boolean
  readonly version: string | number
  readonly createTime: string
  readonly updateTime: string
}

export interface VectorStyle extends VectorStyleSummary {
  readonly definition: VectorStyleDefinition
}

export interface VersionedVectorStyle {
  readonly style: VectorStyle
  readonly etag: string
}

export interface VectorRuleMatch {
  readonly geometryPath: string
  readonly geometryType: VectorGeometryType
  readonly ruleId: string | null
  readonly visible: boolean
  readonly symbol: VectorSymbol | null
}

export interface VectorStyleMatch {
  readonly styleId: string
  readonly layerId: string
  readonly featureId: string
  readonly styleVersion: string | number
  readonly featureVersion: string | number
  readonly zoom: number
  readonly matches: readonly VectorRuleMatch[]
}

export interface VectorRenderContext {
  readonly contextId: string
  readonly layerId: string
  readonly dataVersion: string
  readonly fields: readonly string[]
  readonly aggregatePoints: boolean
  readonly gridPixels: number
  readonly bufferPixels: number
  readonly maxZoom: number
  readonly generalizationBuildId: string
  readonly policyVersion: string
  readonly overviewMaxZoom: number
  readonly overviewAvailable: boolean
  readonly overviewStatus: string
  readonly overviewMessage: string | null
  readonly expiresAt: string
}
export interface VersionedVectorFeature {
  readonly feature: VectorFeature
  readonly etag: string
}
export interface VectorClusterMember {
  readonly featureId: string
  readonly properties: Record<string, unknown> | null
  readonly version: string | number
}
export interface VectorClusterMembers {
  readonly clusterId?: string
  readonly representationId?: string
  readonly members: readonly VectorClusterMember[]
  readonly hasMore: boolean
  readonly nextCursor: string | null
  readonly dataVersion: string
}
export type VectorTileHit =
  | {
      readonly kind: 'feature'
      readonly layerId: string
      readonly featureId: string
    }
  | {
      readonly kind: 'cluster' | 'aggregate'
      readonly layerId: string
      readonly clusterId: string
      readonly contextId: string
      readonly pointCount: string
      readonly featureCount: string
      readonly coordinate: readonly [number, number]
    }
export type VectorClusterHit = Extract<
  VectorTileHit,
  { readonly kind: 'cluster' | 'aggregate' }
>

export interface VectorGeneralizationPolicy {
  readonly enabled: boolean
  readonly detailMinZoom: number
  readonly groupFields: readonly string[]
  readonly lineClassField: string | null
  readonly lineMinZoom: Readonly<Record<string, number>>
  readonly defaultLineMinZoom: number
  readonly polygonMode: 'SIMPLIFY' | 'BUILDINGS' | 'COVERAGE'
  readonly tolerancePixels: number
  readonly cellPixels: number
  readonly aggregationPixels: number
  readonly minPolygonPixels: number
  readonly maxBufferPixels: number
}
export interface VectorGeneralizationBuild {
  readonly buildId: string
  readonly dataVersion: string
  readonly policyVersion: string
  readonly status: string
  readonly completedZoom: number
  readonly maxTileBytes: number
  readonly errorMessage: string | null
}
export interface VectorGeneralization {
  readonly layerId: string
  readonly policy: VectorGeneralizationPolicy
  readonly policyVersion: string
  readonly dataVersion: string
  readonly latestBuild: VectorGeneralizationBuild | null
  readonly publishedBuild: VectorGeneralizationBuild | null
}
export interface VersionedVectorGeneralization {
  readonly state: VectorGeneralization
  readonly etag: string
}
