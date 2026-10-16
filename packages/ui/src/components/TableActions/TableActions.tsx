import styles from './TableActions.module.css'

/** 按钮色调：默认蓝（查看、处理等），破坏性操作红 */
export type TableActionTone = 'default' | 'danger'

export interface TableAction {
  /** 同列内唯一，作 React key */
  readonly key: string
  /** 已解析好的按钮文案（例如「处理中…」由调用方决定） */
  readonly label: string
  readonly tone?: TableActionTone
  readonly disabled?: boolean
  readonly onClick?: () => void
  /**
   * 给了 href 就渲染成 <a> 直接发起导航（如交给浏览器原生下载流式落盘），
   * 此时不使用 onClick；disabled 为 true 时不给 href，按钮置灰且不可点
   */
  readonly href?: string
  /** 仅 href 有效：<a download> 的保存文件名 */
  readonly download?: string
}

interface TableActionsProps {
  /** 多个按钮时的横向分布：默认两端对齐 */
  readonly justify?: 'between' | 'evenly'
  readonly actions: readonly TableAction[]
}

/**
 * 表格操作列的按钮组：无边框、无底色、只有文字（仍是真的 button），
 * 悬停只改 cursor。原先这份样式在 6 张表里各存了一份。
 * 需要直接导航（下载）时给 TableAction.href，改为渲染同款样式的 <a>。
 */
export function TableActions({
  justify = 'between',
  actions,
}: TableActionsProps) {
  const justifyClass =
    justify === 'evenly' ? styles.actionsEvenly : styles.actionsBetween
  return (
    <span className={`${styles.actions} ${justifyClass}`}>
      {actions.map((action) => {
        const className = `${styles.button} ${
          action.tone === 'danger' ? styles.buttonDanger : styles.buttonDefault
        }`
        if (action.href !== undefined) {
          const disabled = action.disabled ?? false
          return (
            <a
              key={action.key}
              className={`${className} ${styles.link}${
                disabled ? ` ${styles.linkDisabled}` : ''
              }`}
              // 禁用时不给 href：只要带了 href 就必然可点，灰按钮挡不住导航
              href={disabled ? undefined : action.href}
              download={disabled ? undefined : action.download}
              aria-disabled={disabled || undefined}
            >
              {action.label}
            </a>
          )
        }
        return (
          <button
            key={action.key}
            type="button"
            className={className}
            onClick={action.onClick}
            disabled={action.disabled ?? false}
          >
            {action.label}
          </button>
        )
      })}
    </span>
  )
}
