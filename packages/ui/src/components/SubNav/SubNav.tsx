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
  /** 接口尚未接入：置灰不可点，悬浮提示「暂未开放」 */
  readonly disabled?: boolean
}

interface SubNavProps {
  /** 下层导航项（模块内的分类） */
  readonly items: readonly SubNavItem[]
  /** 下层的高亮项，通常是路由解析出来的二级路径；不需要高亮时传空串 */
  readonly activePath: string
  /** 顶部大标题；不传则不渲染头部 */
  readonly title?: string
  readonly subtitle?: string
  /** 上层导航项的模块入口（可选）；给了就在下层之上多渲染一组，中间用分隔线隔开 */
  readonly topItems?: readonly SubNavItem[]
  /**
   * 上层导航的高亮项；与 activePath 分开传，便于上层与下层互斥高亮
   * （选上层模块时下层不高亮，反之亦然）
   */
  readonly topActivePath?: string
  /** 下层小标题（可选，如「任务类型」），与数据管理页「数据目录」同款 */
  readonly sectionTitle?: string
}

/** 二级导航：样式与数据管理页的目录导航保持一致，供各页面的左侧次级菜单复用 */
export function SubNav({
  items,
  activePath,
  title,
  subtitle,
  topItems,
  topActivePath = '',
  sectionTitle,
}: SubNavProps) {
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

  /** 单个导航项：禁用 / 可展开 / 普通三种形态，上层与下层共用 */
  function renderItem(item: SubNavItem, itemActivePath: string) {
    const isActive = item.path === itemActivePath
    const isOpen = expandedPaths.has(item.path)
    const rowClass = `${styles.item}${
      item.icon === undefined ? '' : ` ${styles.itemWithIcon}`
    }${isActive ? ` ${styles.itemActive}` : ''}`
    const label = <span className={styles.text}>{item.label}</span>

    // 未接入的项：整体置灰不可点，保留箭头与图标以免与同级项行高、文字位置错位
    if (item.disabled === true) {
      return (
        <li key={item.path}>
          <span
            className={`${rowClass} ${styles.itemDisabled}`}
            aria-disabled="true"
            title="暂未开放"
          >
            {item.expandable === true && (
              <span className={styles.chevronDisabled} aria-hidden="true">
                <span className={styles.chevronIcon}>&gt;</span>
              </span>
            )}
            {item.icon !== undefined && (
              <span className={styles.icon}>
                <img src={item.icon} alt="" className={styles.iconDefault} />
              </span>
            )}
            {item.expandable === true ? (
              <span className={styles.textLink}>{label}</span>
            ) : (
              label
            )}
          </span>
        </li>
      )
    }

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
              aria-label={isOpen ? `收起${item.label}` : `展开${item.label}`}
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
              <img src={item.icon} alt="" className={styles.iconDefault} />
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
      {topItems !== undefined && (
        <div className={styles.group}>
          <ul className={styles.list}>
            {topItems.map((item) => renderItem(item, topActivePath))}
          </ul>
        </div>
      )}
      {topItems !== undefined && <div className={styles.divider} />}
      {sectionTitle !== undefined && (
        <p className={styles.sectionTitle}>{sectionTitle}</p>
      )}
      {/* 已有小标题时不再重复留顶部间距，间距由小标题承担 */}
      <div
        className={`${styles.group}${
          sectionTitle === undefined ? '' : ` ${styles.groupTight}`
        }`}
      >
        <ul className={styles.list}>
          {items.map((item) => renderItem(item, activePath))}
        </ul>
      </div>
    </aside>
  )
}
