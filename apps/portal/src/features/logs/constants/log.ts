/** 日志列表每页条数 */
export const LOG_PAGE_SIZE = 10

/** 日志类别 */
export const LOG_KINDS = ['exception', 'operation', 'login'] as const

export type LogKind = (typeof LOG_KINDS)[number]

export interface LogSection {
  readonly path: string
  readonly label: string
  /** 面包屑里用的短名（顶栏「日志 / 异常日志」） */
  readonly shortLabel: string
  readonly kind: LogKind
  readonly description: string
}

/** 日志的二级导航 */
export const LOG_SECTIONS: readonly LogSection[] = [
  {
    path: '/logs/exception',
    label: '异常日志',
    shortLabel: '异常日志',
    kind: 'exception',
    description: '记录系统运行中的异常堆栈、请求现场与处理状态',
  },
  {
    path: '/logs/operation',
    label: '操作日志',
    shortLabel: '操作日志',
    kind: 'operation',
    description: '记录用户的写操作、请求参数与执行耗时',
  },
  {
    path: '/logs/login',
    label: '登录日志',
    shortLabel: '登录日志',
    kind: 'login',
    description: '记录登录登出、来源 IP 与设备环境',
  },
]

/** 异常日志的状态是处理状态 */
export const EXCEPTION_STATUS_LABELS: Readonly<Record<number, string>> = {
  0: '未处理',
  1: '已处理',
}

/** 操作日志与登录日志的状态是执行结果 */
export const RESULT_STATUS_LABELS: Readonly<Record<number, string>> = {
  0: '失败',
  1: '成功',
}

export interface LogStatusOption {
  readonly value: number
  readonly label: string
}

/** 由状态文案表生成筛选下拉项，避免维护第二份键值对 */
export function toStatusOptions(
  labels: Readonly<Record<number, string>>,
): readonly LogStatusOption[] {
  return Object.entries(labels).map(([value, label]) => ({
    value: Number(value),
    label,
  }))
}
