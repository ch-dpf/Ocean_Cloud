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
}

interface TableActionsProps {
  /** 多个按钮时的横向分布：默认两端对齐 */
  readonly justify?: 'between' | 'evenly'
  readonly actions: readonly TableAction[]
}

/**
 * 表格操作列的按钮组：无边框、无底色、只有文字（仍是真的 button），
 * 悬停只改 cursor。原先这份样式在 6 张表里各存了一份。
 */
export function TableActions({
  justify = 'between',
  actions,
}: TableActionsProps) {
  const justifyClass =
    justify === 'evenly' ? styles.actionsEvenly : styles.actionsBetween
  return (
    <span className={`${styles.actions} ${justifyClass}`}>
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          className={`${styles.button} ${
            action.tone === 'danger'
              ? styles.buttonDanger
              : styles.buttonDefault
          }`}
          onClick={action.onClick}
          disabled={action.disabled ?? false}
        >
          {action.label}
        </button>
      ))}
    </span>
  )
}
