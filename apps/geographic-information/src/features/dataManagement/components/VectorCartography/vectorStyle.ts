/** 制图样式仅保存在当前会话，后端样式接口就绪后再替换为持久化实现。 */
export interface FeatureStyleSetting {
  readonly color: string
  readonly minZoom: number
}

export const DEFAULT_FEATURE_STYLE: FeatureStyleSetting = {
  color: '#1677ff',
  minZoom: 0,
}

export function featureStyleKey(layerId: string, featureId: string): string {
  return `${layerId}:${featureId}`
}

/** 将 #rrggbb 转为指定透明度的 rgba，用于面填充。 */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.replace('#', '')
  if (!/^[\da-f]{6}$/i.test(hex)) return color
  const value = Number.parseInt(hex, 16)
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`
}
