/** 文件大小单位，从字节逐级换算 */
export const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/** 空值 / 空串统一展示为 —（表格与详情里的占位符约定） */
export function cellText(value: string | null | undefined): string {
  return value ? value : '—'
}

/** 后端返回形如 2026-09-11T20:55:43.623167，展示为 2026-09-11 20:55:43 */
export function formatTime(value: string | null | undefined): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/** 后端返回字节数字符串，展示为带单位的可读大小 */
export function formatFileSize(sizeBytes: string | null | undefined): string {
  if (sizeBytes === null || sizeBytes === undefined) return '—'
  const bytes = Number(sizeBytes)
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 ? String(value) : value.toFixed(1)} ${SIZE_UNITS[unit]}`
}
