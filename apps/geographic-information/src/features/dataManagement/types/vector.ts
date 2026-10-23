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

export interface VectorMapDefinition {
  readonly dataSetId: string
  readonly tileVersion: string
  readonly dataRevision: string | number
  readonly minZoom: number
  readonly nativeMaxZoom: number
  readonly displayMaxZoom: number
  readonly tileSize: number
  readonly tiles: string
  readonly extent: VectorGeometry | null
}

export type ZoomStops = readonly (readonly [number, number])[]
export interface CartographyFilter {
  readonly op: string
  readonly field?: string
  readonly value?: unknown
  readonly conditions?: readonly CartographyFilter[]
  readonly condition?: CartographyFilter
}
export interface CartographyOverride {
  readonly symbol: VectorSymbol
  readonly visible?: boolean
}
export interface CartographyStyle {
  readonly id: string
  readonly geometryType: VectorGeometryType
  readonly enabled: boolean
  readonly minZoom: number
  readonly maxZoom: number
  readonly renderOrder: number
  readonly symbol: VectorSymbol
  readonly zoomStops?: Readonly<Record<string, ZoomStops>>
  readonly labels: {
    readonly enabled: boolean
    readonly minZoom: number
    readonly field: string
    readonly fallbackField?: string
    readonly fontSizeStops?: ZoomStops
  }
  readonly casing?: { readonly color: string; readonly widthStops: ZoomStops }
  readonly overrides: readonly {
    readonly filter: CartographyFilter
    readonly minZoom: number
    readonly maxZoom: number
    readonly symbol: VectorSymbol
    readonly zoomStops?: Readonly<Record<string, ZoomStops>>
  }[]
}
export interface VectorCartographyDefinition {
  readonly dataSetId: string
  readonly styleVersion: string | number
  readonly displayRevision: string | number
  readonly defaults: { readonly styles: readonly CartographyStyle[] }
  readonly hasFeatureOverrides: boolean
  readonly groups: Readonly<
    Record<
      string,
      {
        readonly id: string
        readonly enabled: boolean
        readonly styleKey: string
        readonly override?: CartographyOverride
      }
    >
  >
  readonly layers: Readonly<
    Record<
      string,
      {
        readonly enabled: boolean
        readonly automatic: boolean
        readonly configured: boolean
        readonly definition?: VectorStyleDefinition
      }
    >
  >
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
  readonly definition: {
    readonly tilePolicy: {
      readonly minZoom: number
      readonly nativeMaxZoom: number
      readonly displayMaxZoom: number
    }
  }
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

export interface VersionedVectorFeature {
  readonly feature: VectorFeature
  readonly etag: string
}
export interface VectorTileHit {
  readonly kind: 'feature'
  readonly layerId: string
  readonly featureId: string
}
