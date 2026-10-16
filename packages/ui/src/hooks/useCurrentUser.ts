import { useEffect, useState } from 'react'

/**
 * 当前登录用户（GET /api/auth/info 的 data 子集）。
 * 只保留界面展示需要的字段，密码、失败次数等敏感字段不在此列。
 */
export interface CurrentUser {
  readonly username: string
  readonly realName: string | null
  /** 头像地址；为 null 时界面回退默认头像 */
  readonly avatar: string | null
  readonly email: string | null
  readonly phone: string | null
  readonly lastLoginTime: string | null
  readonly lastLoginIp: string | null
  /** 账号状态：1 正常、0 已禁用 */
  readonly status: number | null
}

/**
 * 拉取当前登录用户信息，挂载时请求一次。
 * 请求函数由各应用注入，避免共享包依赖具体应用的 httpClient；
 * 需传入稳定引用（如模块级函数），否则每次渲染都会重新请求。
 * 拉取失败保持 null，界面回退默认头像，不在共享组件里弹错误提示。
 */
export function useCurrentUser(
  load: (signal: AbortSignal) => Promise<CurrentUser>,
): CurrentUser | null {
  const [user, setUser] = useState<CurrentUser | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    load(controller.signal)
      .then((value) => {
        if (active) setUser(value)
      })
      .catch(() => {
        // 拉取失败不阻塞界面；错误提示由 RequestErrorNotice 统一展示
      })
    return () => {
      active = false
      controller.abort()
    }
  }, [load])

  return user
}
