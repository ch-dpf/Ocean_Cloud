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
  VectorSymbol,
} from '../../types/vector'
import { featureStyleKey, matchVectorStyle, withAlpha } from './vectorStyle'

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
    const color = symbol.color ?? '#3388ff'
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
        color: withAlpha(symbol.color ?? '#3388ff', symbol.opacity ?? 1),
        width: (symbol.width ?? 2) + extra,
      }),
    )
  } else {
    style.setFill(
      new Fill({
        color: withAlpha(
          symbol.fillColor ?? '#3388ff',
          symbol.fillOpacity ?? 0.25,
        ),
      }),
    )
    style.setStroke(
      new Stroke({
        color: withAlpha(
          symbol.strokeColor ?? symbol.fillColor ?? '#3388ff',
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

/** MVT 已完成规则匹配与密度控制，客户端只消费服务端下发的符号。 */
export function createVectorTileStyleFunction(settings: {
  current: VectorRenderSettings
}): StyleFunction {
  const cache = new WeakMap<object, { key: string; style: Style }>()
  return (feature) => {
    const layerId = String(feature.get('_vector_layer_id') ?? '')
    const featureId = feature.get('_vector_feature_id') as string | undefined
    if (
      featureId &&
      featureStyleKey(layerId, featureId) === settings.current.selectedKey
    )
      return undefined
    const rawSymbol = feature.get('_vector_symbol')
    if (typeof rawSymbol !== 'string' || rawSymbol.length === 0)
      return undefined
    let value: VectorSymbol
    try {
      value = JSON.parse(rawSymbol) as VectorSymbol
    } catch {
      return undefined
    }
    const geometryType = feature.get('_vector_category') as VectorGeometryType
    const label = String(feature.get('_vector_label') ?? '')
    const order = Number(feature.get('_vector_render_order') ?? 0)
    const key = rawSymbol + ':' + geometryType + ':' + label + ':' + order
    let entry = cache.get(feature)
    if (!entry || entry.key !== key) {
      const style = symbolStyle(
        {
          geometryPath: '',
          geometryType,
          ruleId: String(feature.get('_vector_rule_id') ?? ''),
          visible: true,
          symbol: value,
        },
        undefined,
        false,
      )
      style.setZIndex(order)
      if (value.dashArray && geometryType === 'LINE')
        style.getStroke()?.setLineDash([...value.dashArray])
      const clusterId = feature.get('_vector_cluster_id')
      if (clusterId != null) {
        const count = String(feature.get('_vector_feature_count') ?? '')
        // 聚合点同样使用后端 _vector_symbol；前端只补充数量文本，不另造放大圆点。
        style.setText(
          new Text({
            declutterMode: 'none',
            text: count,
            fill: new Fill({ color: '#ffffff' }),
            stroke: new Stroke({ color: '#253858', width: 2 }),
            font: 'bold 12px sans-serif',
          }),
        )
      } else if (label) {
        style.setText(
          new Text({
            text: label,
            font: '11px sans-serif',
            fill: new Fill({ color: '#202124' }),
            stroke: new Stroke({ color: '#ffffff', width: 3 }),
            overflow: false,
          }),
        )
      }
      entry = { key, style }
      cache.set(feature, entry)
    }
    return entry.style
  }
}

export function readVectorTileHit(
  feature: FeatureLike,
  context: VectorRenderContext,
  coordinate: readonly number[],
): VectorTileHit | null {
  const clusterId = feature.get('_vector_cluster_id')
  if (clusterId != null)
    return {
      kind: 'cluster',
      dataSetId: context.dataSetId,
      contextId: context.contextId,
      clusterId: String(clusterId),
      featureCount: String(feature.get('_vector_feature_count')),
      coordinate: [coordinate[0], coordinate[1]],
    }
  const featureId = feature.get('_vector_feature_id') as string | undefined
  const layerId = feature.get('_vector_layer_id') as string | undefined
  return featureId && layerId ? { kind: 'feature', layerId, featureId } : null
}
