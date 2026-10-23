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
  VectorGeometryType,
  VectorRuleMatch,
  VectorStyleDefinition,
  VectorStyleRule,
  CartographyStyle,
  VectorSymbol,
  VectorCartographyDefinition,
  CartographyOverride,
  CartographyFilter,
  ZoomStops,
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
  readonly cartography?: VectorCartographyDefinition | null
  readonly hiddenGroups?: ReadonlySet<string>
  readonly featureOverrides?: Map<string, CartographyOverride | null>
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

/** 样式在客户端按连续层级计算，数据瓦片无需随配图或缩放重新获取。 */
export function interpolateStops(
  stops: ZoomStops | undefined,
  zoom: number,
  fallback: number,
): number {
  if (!stops?.length) return fallback
  if (zoom <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    const [z, value] = stops[i],
      [previousZ, previousValue] = stops[i - 1]
    if (zoom <= z)
      return (
        previousValue +
        ((value - previousValue) * (zoom - previousZ)) / (z - previousZ)
      )
  }
  return stops[stops.length - 1][1]
}
function templateMatches(
  filter: CartographyFilter,
  properties: Record<string, unknown>,
): boolean {
  if (filter.op === 'and')
    return !!filter.conditions?.every((f) => templateMatches(f, properties))
  if (filter.op === 'or')
    return !!filter.conditions?.some((f) => templateMatches(f, properties))
  if (filter.op === 'not')
    return !!filter.condition && !templateMatches(filter.condition, properties)
  const normalize = (value: unknown) =>
    filter.field === 'fclass' && typeof value === 'string'
      ? value.trim().toLowerCase()
      : filter.field === 'code' && value != null && String(value).trim() !== ''
        ? Number(value)
        : value
  const raw = properties[filter.field ?? '']
  const missing = raw == null || (typeof raw === 'string' && !raw.trim())
  if (filter.op === 'missingOrEmpty') return missing
  if (missing) return false
  const value = normalize(raw)
  if (filter.op === 'in')
    return (
      Array.isArray(filter.value) &&
      filter.value.some((v) => normalize(v) === value)
    )
  if (filter.op === 'eq') return value === normalize(filter.value)
  if (filter.op === 'ne') return value !== normalize(filter.value)
  return false
}
export function createVectorTileStyleFunction(settings: {
  current: VectorRenderSettings
}): StyleFunction {
  type Paint = {
    styles: Style[]
    resolution: number
    update: (zoom: number) => void
  }
  type Prepared = {
    base: CartographyStyle
    propertyRule: CartographyStyle['overrides'][number] | undefined
    group: VectorCartographyDefinition['groups'][string]
    layer: VectorCartographyDefinition['layers'][string]
    properties: Record<string, unknown>
    override: CartographyOverride | null | undefined
    featureKey: string
    role: string
    geometryType: VectorGeometryType
    label: string
    paintKey: string
    custom?: VectorStyleRule
    labelled?: boolean
    paint?: Paint
  }
  let config: VectorCartographyDefinition | null | undefined
  let prepared = new WeakMap<object, Prepared>()
  const paints = new Map<string, Paint>()
  let defaults = new Map<string, CartographyStyle>()
  const identities = new WeakMap<object, number>()
  let nextIdentity = 1
  let lastResolution = NaN,
    zoom = 0
  const identity = (value: object | null | undefined) => {
    if (!value) return 0
    let id = identities.get(value)
    if (!id) {
      id = nextIdentity++
      identities.set(value, id)
    }
    return id
  }
  function makePaint(
    p: Prepared,
    custom: VectorStyleRule | undefined,
    label: string,
  ): Paint {
    const symbol: VectorSymbol = {
      ...p.base.symbol,
      ...p.propertyRule?.symbol,
      ...p.group.override?.symbol,
      ...custom?.symbol,
      ...p.override?.symbol,
    }
    const locked: VectorSymbol = {
      ...p.group.override?.symbol,
      ...custom?.symbol,
      ...p.override?.symbol,
    }
    const stops = { ...p.base.zoomStops, ...p.propertyRule?.zoomStops }
    const number = (
      field:
        | 'width'
        | 'strokeWidth'
        | 'radius'
        | 'opacity'
        | 'strokeOpacity'
        | 'fillOpacity',
      z: number,
      fallback: number,
    ) =>
      locked[field] ??
      interpolateStops(stops[field], z, symbol[field] ?? fallback)
    const styles: Style[] = []
    const isOutline = p.role === 'OUTLINE'
    const value = isOutline
      ? {
          color: symbol.strokeColor,
          width: symbol.strokeWidth,
          opacity: symbol.strokeOpacity,
          dashArray: symbol.dashArray,
        }
      : symbol
    const main =
      p.role === 'LABEL'
        ? new Style()
        : symbolStyle(
            {
              geometryPath: '',
              geometryType: p.geometryType,
              ruleId: p.base.id,
              visible: true,
              symbol: value,
            },
            undefined,
            false,
          )
    if (p.role === 'FILL') main.setStroke(null)
    if (value.dashArray) main.getStroke()?.setLineDash([...value.dashArray])
    main.setZIndex(
      p.base.renderOrder + (p.role === 'LABEL' ? 1000 : isOutline ? 0.1 : 0),
    )
    let casing: Style | undefined
    if (p.role === 'GEOMETRY' && p.geometryType === 'LINE' && p.base.casing) {
      casing = new Style({
        zIndex: p.base.renderOrder - 0.1,
        stroke: new Stroke({ color: p.base.casing.color, width: 1 }),
      })
      styles.push(casing)
    }
    if (label)
      main.setText(
        new Text({
          text: label,
          placement:
            p.role === 'GEOMETRY' && p.geometryType === 'LINE'
              ? 'line'
              : 'point',
          font: '11px sans-serif',
          fill: new Fill({ color: '#202124' }),
          stroke: new Stroke({ color: '#ffffff', width: 3 }),
          overflow: false,
        }),
      )
    styles.push(main)
    return {
      styles,
      resolution: NaN,
      update: (z) => {
        if (main.getStroke())
          main
            .getStroke()!
            .setWidth(
              number(
                isOutline || p.geometryType === 'POLYGON'
                  ? 'strokeWidth'
                  : 'width',
                z,
                1,
              ),
            )
        const image = main.getImage()
        if (image instanceof CircleStyle) {
          image.setRadius(number('radius', z, 6))
          image.getStroke()?.setWidth(number('strokeWidth', z, 0))
        }
        if (casing && p.base.casing)
          casing
            .getStroke()!
            .setWidth(
              Math.max(
                number('width', z, 1),
                interpolateStops(p.base.casing.widthStops, z, 0),
              ),
            )
        if (main.getText())
          main
            .getText()!
            .setFont(
              interpolateStops(p.base.labels.fontSizeStops, z, 11) +
                'px sans-serif',
            )
        if (stops.opacity || stops.strokeOpacity)
          main
            .getStroke()
            ?.setColor(
              withAlpha(
                isOutline
                  ? (symbol.strokeColor ?? '#3388ff')
                  : (symbol.color ?? '#3388ff'),
                number(isOutline ? 'strokeOpacity' : 'opacity', z, 1),
              ),
            )
        if (stops.fillOpacity)
          main
            .getFill()
            ?.setColor(
              withAlpha(
                symbol.fillColor ?? '#3388ff',
                number('fillOpacity', z, 0.25),
              ),
            )
      },
    }
  }
  return (feature, resolution) => {
    const current = settings.current
    if (!current.cartography) return undefined
    if (config !== current.cartography) {
      config = current.cartography
      defaults = new Map(
        config.defaults.styles.map((style) => [style.id, style]),
      )
      prepared = new WeakMap()
      paints.clear()
    }
    if (lastResolution !== resolution) {
      lastResolution = resolution
      zoom = Math.log2(40075016.68557849 / (512 * resolution))
    }
    let p = prepared.get(feature)
    const featureId = String(feature.get('_vector_feature_id') ?? '')
    const override = current.featureOverrides?.get(featureId)
    if (!p || p.override !== override) {
      const layerId = String(feature.get('_vector_layer_id') ?? '')
      const group =
        config.groups[String(feature.get('_vector_group_key') ?? '')]
      const layer = config.layers[layerId]
      const base = group && defaults.get(group.styleKey)
      if (!group || !layer || !base) return undefined
      const properties = { ...feature.getProperties() }
      const nullFields: unknown = JSON.parse(
        String(feature.get('_vector_null_fields') ?? '[]'),
      )
      if (Array.isArray(nullFields))
        for (const field of nullFields)
          if (typeof field === 'string') properties[field] = null
      const propertyRule = layer.automatic
        ? base.overrides.find((rule) =>
            templateMatches(rule.filter, properties),
          )
        : undefined
      const role = String(feature.get('_vector_render_role'))
      p = {
        base,
        propertyRule,
        group,
        layer,
        properties,
        override,
        role,
        geometryType: feature.get('_vector_category') as VectorGeometryType,
        featureKey: featureStyleKey(layerId, featureId),
        label: base.labels.enabled
          ? String(
              properties[base.labels.field] ||
                properties[base.labels.fallbackField ?? ''] ||
                '',
            ).slice(0, 200)
          : '',
        paintKey:
          base.id +
          ':' +
          identity(propertyRule) +
          ':' +
          identity(group.override) +
          ':' +
          identity(override) +
          ':' +
          role,
      }
      prepared.set(feature, p)
    }
    if (
      !p.group.enabled ||
      !p.layer.enabled ||
      !p.layer.configured ||
      current.hiddenGroups?.has(p.group.id) ||
      current.selectedKey === p.featureKey
    )
      return undefined
    const custom = p.layer.definition
      ? matchVectorRule(
          p.layer.definition,
          p.base.geometryType,
          p.properties,
          zoom,
        )
      : undefined
    if (
      !(
        p.override?.visible ??
        custom?.visible ??
        p.group.override?.visible ??
        p.base.enabled
      ) ||
      (p.layer.definition && !custom)
    )
      return undefined
    if (
      zoom < (custom?.minZoom ?? p.propertyRule?.minZoom ?? p.base.minZoom) ||
      zoom >= (custom?.maxZoom ?? p.propertyRule?.maxZoom ?? p.base.maxZoom)
    )
      return undefined
    const labelled =
      !!p.label &&
      zoom >= p.base.labels.minZoom &&
      (p.role === 'LABEL' ||
        (p.role === 'GEOMETRY' && p.geometryType === 'LINE'))
    if (p.role === 'LABEL' && !labelled) return undefined
    if (!p.paint || p.custom !== custom || p.labelled !== labelled) {
      const key =
        p.paintKey + ':' + identity(custom) + ':' + (labelled ? p.label : '')
      let paint = paints.get(key)
      if (!paint) {
        paint = makePaint(p, custom, labelled ? p.label : '')
        if (paints.size >= 16384) paints.delete(paints.keys().next().value!)
        paints.set(key, paint)
      }
      p.paint = paint
      p.custom = custom
      p.labelled = labelled
    }
    if (p.paint.resolution !== resolution) {
      p.paint.update(zoom)
      p.paint.resolution = resolution
    }
    return p.paint.styles
  }
}

export function readVectorTileHit(feature: FeatureLike): VectorTileHit | null {
  const featureId = feature.get('_vector_feature_id') as string | undefined
  const layerId = feature.get('_vector_layer_id') as string | undefined
  return featureId && layerId ? { kind: 'feature', layerId, featureId } : null
}
