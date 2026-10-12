import { STATUS_COLORS } from '../../constants/palette'
import type { StatusTone } from '../../constants/palette'
import styles from './StatusDot.module.css'

interface StatusDotProps {
  /** 语义档次：颜色由全局调色板决定，业务侧只负责把状态映射到档次 */
  readonly tone: StatusTone
  /** 状态文案 */
  readonly label: string
}

/** 状态展示：小方块 + 文案；各表格的「状态」列统一用它，避免颜色各写各的 */
export function StatusDot({ tone, label }: StatusDotProps) {
  return (
    <span className={styles.status}>
      <span
        className={styles.square}
        style={{ background: STATUS_COLORS[tone] }}
        aria-hidden="true"
      />
      {label}
    </span>
  )
}
