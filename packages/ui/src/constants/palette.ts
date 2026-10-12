/**
 * 状态语义色：全局唯一来源。各业务只负责把自己的状态映射到这些语义上，
 * 不再各写一份 hex —— 此前「已完成」的绿在仓库里出现过 3 个不同取值。
 */
export const STATUS_COLORS = {
  /** 排队 / 待处理 / 未开始 / 已停用 */
  pending: '#8394a0',
  /** 进行中 / 处理中 */
  running: '#1267d6',
  /** 已完成 / 已发布 / 成功 */
  done: '#2fa84f',
  /** 部分失败等需要留意的中间态 */
  warning: '#e08c1a',
  /** 失败 */
  failed: '#d64545',
} as const

/** 状态语义档次 */
export type StatusTone = keyof typeof STATUS_COLORS

/** 未识别状态的兜底色 */
export const STATUS_FALLBACK_COLOR: string = STATUS_COLORS.pending

/**
 * 进度条配色：进行中的蓝与「处理进度」弹窗里的条一致（有意区别于状态列的蓝），
 * 终态沿用状态语义色。
 */
export const PROGRESS_COLORS = {
  running: '#1f75f2',
  done: STATUS_COLORS.done,
  failed: STATUS_COLORS.failed,
} as const
