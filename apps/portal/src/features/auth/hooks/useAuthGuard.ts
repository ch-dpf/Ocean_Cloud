import { useEffect } from 'react'
import { isAuthenticated } from '../utils/authToken'
import { HOME_PATH, LOGIN_PATH } from '../constants'

/**
 * 路由守卫：未登录访问内部页面 → 跳登录页；已登录访问登录页 → 回工作台。
 * 返回 false 表示正在跳转，调用方不应渲染内容。
 */
export function useAuthGuard(pathname: string): boolean {
  const authenticated = isAuthenticated()
  const isLoginRoute = pathname === LOGIN_PATH
  useEffect(() => {
    if (!authenticated && !isLoginRoute) {
      location.hash = `#${LOGIN_PATH}`
    } else if (authenticated && isLoginRoute) {
      location.hash = `#${HOME_PATH}`
    }
  }, [authenticated, isLoginRoute])
  return authenticated || isLoginRoute
}
