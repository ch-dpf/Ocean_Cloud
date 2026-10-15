/**
 * 会话过期跳回登录页时带的标记：子应用跳转时拼在 hash 路由的查询串上
 * （如 #/login?reason=session-expired），登录页据此弹一次「太久没操作」的提示。
 * 放在 shared 里是因为跳转方（子应用）与提示方（主平台）是两个应用，需要同一份约定。
 */
export const SESSION_EXPIRED_REASON = 'session-expired'

/**
 * 拼出带会话过期标记的登录页地址。
 * 地址形如 `${portalOrigin}/#${loginPath}?reason=session-expired`，
 * 查询串接在 hash 路由的路径之后，路径匹配不受影响（useHashRoute 会剥掉查询串）。
 */
export function buildSessionExpiredLoginUrl(
  portalOrigin: string,
  loginPath: string,
): string {
  const origin = portalOrigin.replace(/\/$/, '')
  return `${origin}/#${loginPath}?reason=${SESSION_EXPIRED_REASON}`
}

/** 当前地址是否带了会话过期标记；hash 里没有查询串时返回 false */
export function isSessionExpiredRedirect(hash: string): boolean {
  const index = hash.indexOf('?')
  if (index < 0) return false
  return (
    new URLSearchParams(hash.slice(index + 1)).get('reason') ===
    SESSION_EXPIRED_REASON
  )
}
