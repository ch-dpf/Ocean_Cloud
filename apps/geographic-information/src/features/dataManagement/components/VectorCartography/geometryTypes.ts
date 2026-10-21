import type { VectorGeometry } from '../../types/vector'

export type GeometryKind = 'point' | 'line' | 'polygon'

export const GEOMETRY_KINDS: readonly GeometryKind[] = [
  'point',
  'line',
  'polygon',
]

export const GEOMETRY_KIND_LABEL: Record<GeometryKind, string> = {
  point: '点',
  line: '线',
  polygon: '面',
}

const TYPE_KIND: Record<string, GeometryKind> = {
  point: 'point',
  multipoint: 'point',
  linestring: 'line',
  multilinestring: 'line',
  polygon: 'polygon',
  multipolygon: 'polygon',
}

function kindOfType(type: string): GeometryKind | null {
  return TYPE_KIND[type.toLowerCase()] ?? null
}

/** GeometryCollection 会递归收集，单个要素可同时包含点和面。 */
export function collectGeometryKinds(
  geometry: VectorGeometry | null | undefined,
  result = new Set<GeometryKind>(),
): Set<GeometryKind> {
  if (!geometry) return result
  const kind = kindOfType(geometry.type)
  if (kind) result.add(kind)
  if (geometry.type === 'GeometryCollection') {
    for (const child of geometry.geometries ?? [])
      collectGeometryKinds(child, result)
  }
  return result
}

export function sortGeometryKinds(
  kinds: Iterable<GeometryKind>,
): readonly GeometryKind[] {
  const values = new Set(kinds)
  return GEOMETRY_KINDS.filter((kind) => values.has(kind))
}

export function geometryKindLabels(
  geometry: VectorGeometry | null | undefined,
): readonly string[] {
  return sortGeometryKinds(collectGeometryKinds(geometry)).map(
    (kind) => GEOMETRY_KIND_LABEL[kind],
  )
}

/** 图层 geometryTypes 可能是数组、JSON 字符串或类型映射对象，统一解析为点/线/面。 */
export function parseLayerGeometryKinds(raw: unknown): readonly GeometryKind[] {
  let values: readonly unknown[]
  if (Array.isArray(raw)) {
    values = raw
  } else if (typeof raw === 'string') {
    let parsed: unknown = raw
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      // 非 JSON 字符串按常见分隔符继续拆分。
    }
    values = Array.isArray(parsed)
      ? parsed
      : String(parsed)
          .split(/[,，、\s]+/)
          .filter(Boolean)
  } else if (raw && typeof raw === 'object') {
    values = Object.keys(raw)
  } else {
    return []
  }

  const kinds = new Set<GeometryKind>()
  for (const value of values) {
    let type = ''
    if (typeof value === 'string') type = value
    else if (value && typeof value === 'object' && 'type' in value)
      type = String((value as { type: unknown }).type)
    const kind = kindOfType(type)
    if (kind) kinds.add(kind)
  }
  return sortGeometryKinds(kinds)
}
