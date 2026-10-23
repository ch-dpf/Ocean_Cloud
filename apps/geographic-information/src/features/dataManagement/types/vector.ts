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
  readonly groupId: string | null
  readonly originalGroupId: string | null
  readonly geometryType: VectorGeometryType | null
  readonly assignmentMode: 'AUTO' | 'MANUAL'
  readonly enabled: boolean
  readonly styleMode: 'INHERIT_TARGET_GROUP' | 'CUSTOM' | 'UNCONFIGURED'
  readonly presentationVersion: string | number
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
  readonly source?: VectorSourceReference | null
}

export interface VectorSourceReference {
  readonly featureIndex: string | number
  readonly featureId: unknown
  readonly geometryPath: string
  readonly classificationRuleKey: string | null
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
  readonly dashArray?: readonly number[]
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
  readonly dataSetId: string
  readonly styleVersion: string | number
  readonly dataRevision: string | number
  readonly displayRevision: string | number
  readonly bbox: readonly [number, number, number, number]
  readonly displayZoom: number
  readonly widthPixels: number
  readonly heightPixels: number
  readonly budget: string | number
  readonly objectCount: string | number
  readonly gridPixels: number
  readonly forceAggregation: boolean
  readonly maxZoom: number
  readonly expiresAt: string
  readonly plans?: unknown
  readonly policy?: unknown
}

export interface VectorViewport {
  readonly bbox: readonly [number, number, number, number]
  readonly displayZoom: number
  readonly widthPixels: number
  readonly heightPixels: number
}

export interface VectorGroup {
  readonly id: string
  readonly parentId: string | null
  readonly groupKey: string
  readonly name: string
  readonly nodeType: string
  readonly geometryType: VectorGeometryType | null
  readonly assignable: boolean
  readonly defaultStyleKey: string | null
  readonly enabled: boolean
  readonly version: string | number
  readonly layerCount: string | number
  readonly featureCount: string | number
  readonly children: readonly VectorGroup[]
}

export interface DatasetVectorStyle {
  readonly snapshotId: string
  readonly dataSetId: string
  readonly templateId: string
  readonly templateVersion: string | number
  readonly styleVersion: string | number
  readonly dataRevision: string | number
  readonly displayRevision: string | number
  readonly definition: unknown
}

export interface EffectiveVectorStyle {
  readonly layerId: string
  readonly source: 'GROUP' | 'CUSTOM' | 'UNCONFIGURED'
  readonly groupId: string | null
  readonly styleId: string | null
  readonly version: string | number
  readonly presentationVersion: string | number
  readonly configured: boolean
  readonly definition: unknown
}

export interface VectorCustomStyle {
  readonly minZoom: number
  readonly maxZoom: number
  readonly symbol: VectorSymbol
}

export interface VectorLayerPresentationInput {
  readonly groupId: string
  readonly styleMode: 'INHERIT_TARGET_GROUP' | 'CUSTOM'
  readonly enabled: boolean
  readonly customStyle?: VectorCustomStyle
}

export interface VersionedVectorLayer {
  readonly layer: VectorLayer
  readonly etag: string
}

export interface VersionedVectorGroups {
  readonly groups: readonly VectorGroup[]
  readonly etag: string
}

export interface VectorRenderContextInput extends VectorViewport {
  readonly enabledGroupIds?: readonly string[]
  readonly enabledLayerIds?: readonly string[]
}
export interface VersionedVectorFeature {
  readonly feature: VectorFeature
  readonly etag: string
}
export interface VectorClusterMember {
  readonly layerId: string
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
      readonly kind: 'cluster'
      readonly dataSetId: string
      readonly clusterId: string
      readonly contextId: string
      readonly featureCount: string
      readonly coordinate: readonly [number, number]
    }
export type VectorClusterHit = Extract<
  VectorTileHit,
  { readonly kind: 'cluster' }
>
