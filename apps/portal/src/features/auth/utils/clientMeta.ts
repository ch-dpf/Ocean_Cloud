const DEVICE_ID_KEY = 'ocean_cloud_device_id'

/** 获取或生成设备 ID，持久存 localStorage 复用 */
export function getOrCreateDeviceId(): string {
  try {
    const exists = localStorage.getItem(DEVICE_ID_KEY)
    if (exists) return exists
    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(DEVICE_ID_KEY, generated)
    return generated
  } catch {
    return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  }
}

/** 从 navigator.userAgent 解析浏览器和操作系统 */
export function getClientLoginMeta(): {
  readonly browser: string
  readonly os: string
  readonly userAgent: string
} {
  const userAgent = navigator.userAgent || ''
  const browser = userAgent.includes('Edg')
    ? 'Edge'
    : userAgent.includes('Chrome')
      ? 'Chrome'
      : userAgent.includes('Firefox')
        ? 'Firefox'
        : userAgent.includes('Safari')
          ? 'Safari'
          : 'Unknown'
  let os = 'Unknown'
  if (userAgent.includes('Windows NT 10.0')) os = 'Windows 10'
  else if (userAgent.includes('Windows')) os = 'Windows'
  else if (userAgent.includes('Mac OS X')) os = 'macOS'
  else if (userAgent.includes('Android')) os = 'Android'
  else if (userAgent.includes('iPhone') || userAgent.includes('iPad'))
    os = 'iOS'
  else if (userAgent.includes('Linux')) os = 'Linux'
  return { browser, os, userAgent }
}
