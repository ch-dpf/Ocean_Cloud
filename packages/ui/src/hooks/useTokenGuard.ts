import { useEffect } from 'react'

export interface TokenGuardOptions {
  /** 当前路由路径；变化时触发一次校验 */
  readonly pathname: string
  /** 校验 token 是否有效，返回 false 表示失效；需传入稳定引用（如模块级函数） */
  readonly validate: (signal: AbortSignal) => Promise<boolean>
  /** 判定失效后的处理，通常是清理会话并跳转登录页；需传入稳定引用 */
  readonly onInvalid: () => void
}

/**
 * 跨路由 token 校验：路由变化时校验一次，失效则执行 onInvalid。
 * 不阻塞渲染；上一次未完成的校验会被取消；校验过程本身出错不视为失效。
 */
export function useTokenGuard({
  pathname,
  validate,
  onInvalid,
}: TokenGuardOptions): void {
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    validate(controller.signal)
      .then((valid) => {
        if (active && !valid) onInvalid()
      })
      .catch(() => {
        // 校验失败不在此处处理，错误提示由 RequestErrorNotice 统一展示
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [pathname, validate, onInvalid])
}
