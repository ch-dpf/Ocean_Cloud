import type {
  VectorFeature,
  VectorFilter,
  VectorGeometry,
  VectorGeometryType,
  VectorRuleMatch,
  VectorStyleDefinition,
  VectorStyleRule,
} from '../../types/vector'

export function featureStyleKey(layerId: string, featureId: string): string {
  return layerId + ':' + featureId
}

export function withAlpha(color: string, alpha: number): string {
  const value = Number.parseInt(color.slice(1), 16)
  return (
    'rgba(' +
    ((value >> 16) & 255) +
    ',' +
    ((value >> 8) & 255) +
    ',' +
    (value & 255) +
    ',' +
    alpha +
    ')'
  )
}

export function newStyleRule(
  geometryType: VectorGeometryType,
  id: string,
): VectorStyleRule {
  const color = '#3388ff'
  const symbol =
    geometryType === 'POLYGON'
      ? {
          fillColor: color,
          fillOpacity: 0.25,
          strokeColor: color,
          strokeWidth: 1,
          strokeOpacity: 1,
        }
      : geometryType === 'LINE'
        ? { color, width: 2, opacity: 1 }
        : { color, radius: 6, opacity: 1, strokeColor: color, strokeWidth: 0 }
  return { id, geometryType, visible: true, symbol }
}

export function newStyleDefinition(): VectorStyleDefinition {
  return {
    schemaVersion: 1,
    rules: [
      newStyleRule('POLYGON', 'polygons'),
      newStyleRule('LINE', 'lines'),
      newStyleRule('POINT', 'points'),
    ],
  }
}

/** 属性名按字面取值；缺失与 null 不同，数值与字符串不做转换。 */
export function matchesFilter(
  filter: VectorFilter | null | undefined,
  properties: Record<string, unknown> | null,
): boolean {
  if (!filter) return true
  if ('conditions' in filter) {
    return filter.op === 'and'
      ? filter.conditions.every((item) => matchesFilter(item, properties))
      : filter.conditions.some((item) => matchesFilter(item, properties))
  }
  const exists = properties !== null && Object.hasOwn(properties, filter.field)
  if (filter.op === 'exists') return exists === (filter.value ?? true)
  if (!exists) return false
  const actual = properties![filter.field]
  const expected = filter.value
  if (filter.op === 'eq') return actual === expected
  if (filter.op === 'ne') return actual !== expected
  if (filter.op === 'in')
    return Array.isArray(expected) && expected.includes(actual)
  if (
    typeof actual !== 'number' ||
    !Number.isFinite(actual) ||
    typeof expected !== 'number'
  )
    return false
  switch (filter.op) {
    case 'gt':
      return actual > expected
    case 'gte':
      return actual >= expected
    case 'lt':
      return actual < expected
    case 'lte':
      return actual <= expected
    default:
      return false
  }
}

const GEOMETRY_TYPES: Record<string, VectorGeometryType> = {
  Point: 'POINT',
  MultiPoint: 'POINT',
  LineString: 'LINE',
  MultiLineString: 'LINE',
  Polygon: 'POLYGON',
  MultiPolygon: 'POLYGON',
}

/** 与后端一致：按顺序首条命中，[minZoom,maxZoom)，未命中隐藏；集合逐子几何匹配。 */
export function matchVectorStyle(
  definition: VectorStyleDefinition,
  feature: VectorFeature,
  zoom: number,
): VectorRuleMatch[] {
  const matches: VectorRuleMatch[] = []
  function visit(geometry: VectorGeometry, path: string) {
    if (geometry.type === 'GeometryCollection') {
      geometry.geometries?.forEach((child, index) =>
        visit(child, path + '/geometries/' + index),
      )
      return
    }
    const geometryType = GEOMETRY_TYPES[geometry.type]
    if (!geometryType) return
    const rule = matchVectorRule(
      definition,
      geometryType,
      feature.properties,
      zoom,
    )
    const visible = !!rule && rule.visible !== false
    matches.push({
      geometryPath: path,
      geometryType,
      ruleId: rule?.id ?? null,
      visible,
      symbol: visible ? (rule?.symbol ?? null) : null,
    })
  }
  visit(feature.geometry, '/geometry')
  return matches
}

export const GEOMETRY_OPTIONS = [
  { value: 'POINT', label: '点 / 多点' },
  { value: 'LINE', label: '线 / 多线' },
  { value: 'POLYGON', label: '面 / 多面' },
]

export function matchVectorRule(
  definition: VectorStyleDefinition,
  geometryType: VectorGeometryType,
  properties: Record<string, unknown> | null,
  zoom: number,
): VectorStyleRule | undefined {
  return definition.rules.find(
    (item) =>
      item.geometryType === geometryType &&
      (item.minZoom == null || zoom >= item.minZoom) &&
      (item.maxZoom == null || zoom < item.maxZoom) &&
      matchesFilter(item.filter, properties),
  )
}
export function vectorRenderFields(
  definition: VectorStyleDefinition,
): readonly string[] {
  const fields = new Set<string>()
  function visit(filter: VectorFilter | null | undefined) {
    if (!filter) return
    if ('conditions' in filter) filter.conditions.forEach(visit)
    else fields.add(filter.field)
  }
  definition.rules.forEach((rule) => visit(rule.filter))
  return [...fields].sort()
}
export function vectorRenderBuffer(definition: VectorStyleDefinition): number {
  let pixels = 64
  for (const rule of definition.rules) {
    if (rule.visible === false) continue
    const symbol = rule.symbol
    if (!symbol) continue
    const size =
      rule.geometryType === 'POINT'
        ? (symbol.radius ?? 6) + (symbol.strokeWidth ?? 0) / 2
        : (rule.geometryType === 'LINE'
            ? (symbol.width ?? 2)
            : (symbol.strokeWidth ?? 1)) / 2
    pixels = Math.max(pixels, Math.ceil(size + 4))
  }
  return Math.min(2048, pixels)
}
