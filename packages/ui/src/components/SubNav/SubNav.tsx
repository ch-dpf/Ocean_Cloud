import { useState } from 'react'
import styles from './SubNav.module.css'

export interface SubNavItem {
  /** 点击后跳转的 hash 路径 */
  readonly path: string
  readonly label: string
  /** 默认态图标（import 后的 URL 或 public 目录路径） */
  readonly icon?: string
  /** 激活态图标；与默认态图标配合做 hover/active 切换 */
  readonly activeIcon?: string
  /** 带展开抽屉：点箭头展开占位区域（数据接入前先占位） */
  readonly expandable?: boolean
}

interface SubNavProps {
  readonly items: readonly SubNavItem[]
  /** 当前高亮的项，通常是路由解析出来的二级路径 */
  readonly activePath: string
  /** 顶部大标题；不传则不渲染头部 */
  readonly title?: string
  readonly subtitle?: string
}

/** 二级导航：样式与数据管理页的目录导航保持一致，供各页面的左侧次级菜单复用 */
export function SubNav({ items, activePath, title, subtitle }: SubNavProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(
    () => new Set(),
  )

  function toggle(path: string) {
    setExpandedPaths((previous) => {
      const next = new Set(previous)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  return (
    <aside className={styles.subNav}>
      {title !== undefined && (
        <div className={styles.header}>
          <p className={styles.title}>{title}</p>
          {subtitle !== undefined && (
            <p className={styles.subtitle}>{subtitle}</p>
          )}
        </div>
      )}
      <ul className={styles.list}>
        {items.map((item) => {
          const isActive = item.path === activePath
          const isOpen = expandedPaths.has(item.path)
          const rowClass = `${styles.item}${
            item.icon === undefined ? '' : ` ${styles.itemWithIcon}`
          }${isActive ? ` ${styles.itemActive}` : ''}`
          const label = <span className={styles.text}>{item.label}</span>

          // 可展开项：箭头负责展开，文字负责切换（箭头不能嵌在链接里）
          if (item.expandable === true) {
            return (
              <li key={item.path}>
                <div className={rowClass}>
                  <button
                    type="button"
                    className={styles.chevron}
                    onClick={() => toggle(item.path)}
                    aria-expanded={isOpen}
                    aria-label={
                      isOpen ? `收起${item.label}` : `展开${item.label}`
                    }
                  >
                    <span
                      className={`${styles.chevronIcon}${
                        isOpen ? ` ${styles.chevronOpen}` : ''
                      }`}
                      aria-hidden="true"
                    >
                      &gt;
                    </span>
                  </button>
                  <a
                    href={`#${item.path}`}
                    aria-current={isActive ? 'page' : undefined}
                    className={styles.textLink}
                  >
                    {label}
                  </a>
                </div>
                {isOpen && <div className={styles.drawer} aria-hidden="true" />}
              </li>
            )
          }

          // 普通项：整行都是链接，图片也跟随 hover/active 切换
          return (
            <li key={item.path}>
              <a
                href={`#${item.path}`}
                aria-current={isActive ? 'page' : undefined}
                className={rowClass}
              >
                {item.icon !== undefined && (
                  <span className={styles.icon}>
                    <img
                      src={item.icon}
                      alt=""
                      className={styles.iconDefault}
                    />
                    {item.activeIcon !== undefined && (
                      <img
                        src={item.activeIcon}
                        alt=""
                        className={styles.iconActive}
                      />
                    )}
                  </span>
                )}
                {label}
              </a>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
