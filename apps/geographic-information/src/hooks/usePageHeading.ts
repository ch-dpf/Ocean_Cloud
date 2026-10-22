import { createContext, useContext } from 'react'

/**
 * 页面覆盖顶栏标题的入口；传 null 表示回退到路由计算的标题。
 * 布局层提供 Provider，业务页面通过 useSetPageHeading 在选中态变化时更新。
 */
export const PageHeadingContext = createContext<
  (heading: string | null) => void
>(() => {})

export function useSetPageHeading() {
  return useContext(PageHeadingContext)
}
