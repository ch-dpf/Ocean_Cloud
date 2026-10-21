import type { VectorStyleDefinition } from '../../types/vector'

function requireValue(valid: boolean, message: string): asserts valid {
  if (!valid) throw new Error(message)
}
function object(
  value: unknown,
  allowed: readonly string[],
  name: string,
): Record<string, unknown> {
  requireValue(
    !!value && typeof value === 'object' && !Array.isArray(value),
    name + '须为对象',
  )
  const record = value as Record<string, unknown>
  requireValue(
    Object.keys(record).every((key) => allowed.includes(key)),
    name + '包含不支持的字段',
  )
  return record
}
function text(value: unknown, max: number): boolean {
  return typeof value === 'string' && !!value.trim() && value.length <= max
}
function scalar(value: unknown): boolean {
  return (
    value === null ||
    typeof value === 'boolean' ||
    (typeof value === 'string' && value.length <= 4096) ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}
function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

/** 预览和提交共用校验，避免无效草稿进入地图渲染。服务端仍做最终校验。 */
export function validateStyleDefinition(value: unknown): VectorStyleDefinition {
  const definition = object(value, ['schemaVersion', 'rules'], '样式定义')
  requireValue(definition.schemaVersion === 1, '仅支持样式版本 1')
  requireValue(
    Array.isArray(definition.rules) && definition.rules.length <= 128,
    '最多支持 128 条规则',
  )
  requireValue(
    new TextEncoder().encode(JSON.stringify(value)).length <= 128 * 1024,
    '样式定义不能超过 128 KiB',
  )
  let nodes = 0
  function filter(value: unknown, depth: number) {
    requireValue(
      depth <= 8 && ++nodes <= 512,
      '属性条件最多嵌套 8 层，合计最多 512 个节点',
    )
    const item = object(
      value,
      ['op', 'field', 'value', 'conditions'],
      '属性条件',
    )
    if (item.op === 'and' || item.op === 'or') {
      object(item, ['op', 'conditions'], '组合条件')
      requireValue(
        Array.isArray(item.conditions) &&
          item.conditions.length >= 1 &&
          item.conditions.length <= 32,
        '组合条件需要 1 至 32 个子条件',
      )
      item.conditions.forEach((child) => filter(child, depth + 1))
      return
    }
    object(item, ['op', 'field', 'value'], '属性条件')
    requireValue(text(item.field, 255), '属性字段不能为空且不能超过 255 字符')
    requireValue(
      ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'exists'].includes(
        String(item.op),
      ),
      '属性运算符无效',
    )
    if (item.op === 'exists') {
      requireValue(
        item.value === undefined || typeof item.value === 'boolean',
        '存在性条件的值须为布尔值',
      )
    } else if (item.op === 'in') {
      requireValue(
        Array.isArray(item.value) &&
          item.value.length >= 1 &&
          item.value.length <= 100 &&
          item.value.every(scalar),
        '包含条件须为 1 至 100 个 JSON 标量组成的数组',
      )
    } else {
      requireValue(scalar(item.value), '比较值须为字符串、数字、布尔值或 null')
      if (item.op !== 'eq' && item.op !== 'ne')
        requireValue(typeof item.value === 'number', '大小比较仅支持数字')
    }
  }
  const ids = new Set<string>()
  for (const value of definition.rules) {
    const rule = object(
      value,
      [
        'id',
        'geometryType',
        'minZoom',
        'maxZoom',
        'filter',
        'visible',
        'symbol',
      ],
      '规则',
    )
    requireValue(
      typeof rule.id === 'string' &&
        /^[A-Za-z0-9_-]{1,64}$/.test(rule.id) &&
        !ids.has(rule.id),
      '规则 ID 须唯一，使用 1 至 64 位字母、数字、下划线或连字符',
    )
    ids.add(rule.id)
    requireValue(
      ['POINT', 'LINE', 'POLYGON'].includes(String(rule.geometryType)),
      '请选择点、线或面',
    )
    for (const bound of [rule.minZoom, rule.maxZoom]) {
      requireValue(bound == null || nonnegative(bound), '层级须为非负有限数字')
    }
    requireValue(
      rule.minZoom == null ||
        rule.maxZoom == null ||
        Number(rule.minZoom) < Number(rule.maxZoom),
      '起始层级须小于结束层级',
    )
    if (rule.filter != null) filter(rule.filter, 0)
    requireValue(
      rule.visible === undefined || typeof rule.visible === 'boolean',
      '可见性须为布尔值',
    )
    if (rule.visible === false && rule.symbol == null) continue
    const polygon = rule.geometryType === 'POLYGON'
    const point = rule.geometryType === 'POINT'
    const symbol = object(
      rule.symbol,
      polygon
        ? [
            'fillColor',
            'fillOpacity',
            'strokeColor',
            'strokeWidth',
            'strokeOpacity',
          ]
        : point
          ? ['color', 'radius', 'opacity', 'strokeColor', 'strokeWidth']
          : ['color', 'width', 'opacity'],
      '符号',
    )
    const colorKey = polygon ? 'fillColor' : 'color'
    requireValue(
      typeof symbol[colorKey] === 'string' &&
        /^#[0-9a-f]{6}$/i.test(symbol[colorKey]),
      '颜色须为六位十六进制颜色',
    )
    if (symbol.strokeColor !== undefined)
      requireValue(
        typeof symbol.strokeColor === 'string' &&
          /^#[0-9a-f]{6}$/i.test(symbol.strokeColor),
        '描边颜色无效',
      )
    for (const key of [
      'radius',
      'width',
      'strokeWidth',
      'opacity',
      'fillOpacity',
      'strokeOpacity',
    ]) {
      const number = symbol[key]
      if (number === undefined) continue
      const max = key.toLowerCase().includes('opacity') ? 1 : 1024
      requireValue(
        nonnegative(number) &&
          number <= max &&
          (!['radius', 'width'].includes(key) || number > 0),
        key + ' 超出允许范围',
      )
    }
  }
  return value as VectorStyleDefinition
}
