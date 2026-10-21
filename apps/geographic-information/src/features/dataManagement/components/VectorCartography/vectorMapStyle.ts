import Feature from 'ol/Feature.js'
import type { FeatureLike } from 'ol/Feature.js'
import Text from 'ol/style/Text.js'
import type View from 'ol/View.js'
import GeometryCollection from 'ol/geom/GeometryCollection.js'
import type Geometry from 'ol/geom/Geometry.js'
import CircleStyle from 'ol/style/Circle.js'
import Fill from 'ol/style/Fill.js'
import Stroke from 'ol/style/Stroke.js'
import Style, { type StyleFunction } from 'ol/style/Style.js'
import type {
  VectorFeature,
  VectorTileHit,
  VectorRenderContext,
  VectorGeometryType,
  VectorRuleMatch,
  VectorStyleDefinition,
} from '../../types/vector'
import {
  featureStyleKey,
  matchVectorStyle,
  matchVectorRule,
  withAlpha,
} from './vectorStyle'

export interface VectorRenderSettings {
  readonly definitions: Readonly<Record<string, VectorStyleDefinition>>
  readonly selectedKey: string | null
}
function geometryAtPath(root: Geometry, path: string): Geometry | undefined {
  let geometry: Geometry | undefined = root
  const parts = path.split('/')
  for (let index = 3; index < parts.length; index += 2) {
    if (!(geometry instanceof GeometryCollection)) return undefined
    geometry = geometry.getGeometriesArray()[Number(parts[index])]
  }
  return geometry
}
function symbolStyle(
  match: VectorRuleMatch,
  geometry: Geometry | undefined,
  selected: boolean,
): Style {
  const symbol = match.symbol!
  const extra = selected ? 2 : 0
  const style = new Style({
    geometry,
    zIndex: selected
      ? 100
      : match.geometryType === 'POINT'
        ? 2
        : match.geometryType === 'LINE'
          ? 1
          : 0,
  })
  if (match.geometryType === 'POINT') {
    const color = symbol.color!
    style.setImage(
      new CircleStyle({
        declutterMode: 'none',
        radius: (symbol.radius ?? 6) + extra,
        fill: new Fill({ color: withAlpha(color, symbol.opacity ?? 1) }),
        stroke: new Stroke({
          color: withAlpha(symbol.strokeColor ?? color, symbol.opacity ?? 1),
          width: (symbol.strokeWidth ?? 0) + extra,
        }),
      }),
    )
  } else if (match.geometryType === 'LINE') {
    style.setStroke(
      new Stroke({
        color: withAlpha(symbol.color!, symbol.opacity ?? 1),
        width: (symbol.width ?? 2) + extra,
      }),
    )
  } else {
    style.setFill(
      new Fill({
        color: withAlpha(symbol.fillColor!, symbol.fillOpacity ?? 0.25),
      }),
    )
    style.setStroke(
      new Stroke({
        color: withAlpha(
          symbol.strokeColor ?? symbol.fillColor!,
          symbol.strokeOpacity ?? 1,
        ),
        width: (symbol.strokeWidth ?? 1) + extra,
      }),
    )
  }
  return style
}

/** 集合子几何独立渲染，点击后仍返回原始要素；样式对象按要素和规则缓存。 */
export function createVectorStyleFunction(
  view: View,
  settings: { current: VectorRenderSettings },
): StyleFunction {
  const cache = new WeakMap<
    Feature,
    {
      definition: VectorStyleDefinition
      selected: boolean
      symbols: Map<string, Style>
    }
  >()
  return (feature, resolution) => {
    if (!(feature instanceof Feature)) return undefined
    const record = feature.get('__vectorRecord') as VectorFeature | undefined
    const definition = record && settings.current.definitions[record.layerId]
    const root = feature.getGeometry()
    if (!record || !definition || !root) return undefined
    const selected =
      featureStyleKey(record.layerId, record.id) ===
      settings.current.selectedKey
    let entry = cache.get(feature)
    if (
      !entry ||
      entry.definition !== definition ||
      entry.selected !== selected
    ) {
      entry = { definition, selected, symbols: new Map() }
      cache.set(feature, entry)
    }
    const matches = matchVectorStyle(
      definition,
      record,
      view.getZoomForResolution(resolution) ?? 0,
    )
    const styles: Style[] = []
    for (const match of matches) {
      if (!match.visible || !match.symbol) continue
      const key = match.geometryPath + ':' + match.ruleId
      let style = entry.symbols.get(key)
      if (!style) {
        const geometry = geometryAtPath(root, match.geometryPath)
        if (!geometry) continue
        style = symbolStyle(match, geometry, selected)
        entry.symbols.set(key, style)
      }
      styles.push(style)
    }
    return styles
  }
}

const tileProperties = new WeakMap<object, Record<string, unknown>>()
function projectedProperties(feature: FeatureLike): Record<string, unknown> {
  let properties = tileProperties.get(feature)
  if (!properties) {
    properties = JSON.parse(
      String(feature.get('_vector_properties') ?? '{}'),
    ) as Record<string, unknown>
    tileProperties.set(feature, properties)
  }
  return properties
}

/** RenderFeature 直接制图，原始属性类型及集合路径由 MVT 元数据保留。 */
export function createVectorTileStyleFunction(
  view: View,
  settings: { current: VectorRenderSettings },
  layerId: string,
): StyleFunction {
  const cache = new WeakMap<
    object,
    { definition: VectorStyleDefinition; symbols: Map<string, Style> }
  >()
  return (feature, resolution) => {
    const definition = settings.current.definitions[layerId]
    if (!definition) return undefined
    const featureId = feature.get('_vector_feature_id') as string | undefined
    if (
      featureId &&
      featureStyleKey(layerId, featureId) === settings.current.selectedKey
    )
      return undefined
    const geometryType = feature.get('_vector_category') as VectorGeometryType
    const rule = matchVectorRule(
      definition,
      geometryType,
      projectedProperties(feature),
      view.getZoomForResolution(resolution) ?? 0,
    )
    if (!rule || rule.visible === false || !rule.symbol) return undefined
    let entry = cache.get(feature)
    if (!entry || entry.definition !== definition) {
      entry = { definition, symbols: new Map() }
      cache.set(feature, entry)
    }
    let symbol = entry.symbols.get(rule.id)
    if (!symbol) {
      symbol = symbolStyle(
        {
          geometryPath: '',
          geometryType,
          ruleId: rule.id,
          visible: true,
          symbol: rule.symbol,
        },
        undefined,
        false,
      )
      if (feature.get('_vector_kind') === 'cluster') {
        const count = String(feature.get('_vector_count'))
        symbol.setImage(
          new CircleStyle({
            declutterMode: 'none',
            radius: Math.min(24, 12 + Math.log10(Number(count)) * 3),
            fill: new Fill({
              color: withAlpha(
                rule.symbol.color ?? '#3388ff',
                rule.symbol.opacity ?? 1,
              ),
            }),
            stroke: new Stroke({ color: '#ffffff', width: 2 }),
          }),
        )
        symbol.setText(
          new Text({
            declutterMode: 'none',
            text: count,
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#253858', width: 2 }),
            font: 'bold 12px sans-serif',
          }),
        )
      }
      entry.symbols.set(rule.id, symbol)
    }
    return symbol
  }
}

export function readVectorTileHit(
  feature: FeatureLike,
  context: VectorRenderContext,
  coordinate: readonly number[],
): VectorTileHit | null {
  if (feature.get('_vector_kind') === 'aggregate')
    return {
      kind: 'aggregate',
      layerId: context.layerId,
      contextId: context.contextId,
      clusterId: String(feature.get('_vector_representation_id')),
      pointCount: '0',
      featureCount: String(feature.get('_vector_feature_count')),
      coordinate: [coordinate[0], coordinate[1]],
    }
  if (feature.get('_vector_kind') === 'cluster')
    return {
      kind: 'cluster',
      layerId: context.layerId,
      contextId: context.contextId,
      clusterId: String(feature.get('_vector_cluster_id')),
      pointCount: String(feature.get('_vector_count')),
      featureCount: String(feature.get('_vector_feature_count')),
      coordinate: [coordinate[0], coordinate[1]],
    }
  const featureId = feature.get('_vector_feature_id') as string | undefined
  return featureId
    ? { kind: 'feature', layerId: context.layerId, featureId }
    : null
}
