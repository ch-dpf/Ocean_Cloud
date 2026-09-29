/**
 * 平台用户（/api/member/user/query 的 records 项）。
 * 只建模界面用得到的字段：后端返回的 password 等凭据字段一律不在此列。
 */
export interface MemberUser {
  readonly id: string
  readonly username: string
  readonly realName: string | null
  /** 头像地址；为 null 时界面回退默认头像 */
  readonly avatar: string | null
  readonly email: string | null
  readonly phone: string | null
  /** 账号状态：1 正常、0 已禁用 */
  readonly status: number
  readonly roleType: string | null
  readonly roleCodes: readonly string[] | null
  readonly platformCodes: readonly string[] | null
  readonly lastLoginTime: string | null
  readonly lastLoginIp: string | null
  readonly activeSessionCount: number | null
  readonly maxConcurrentSessions: number | null
  readonly failedPasswordAttempts: number | null
  readonly lastPasswordErrorTime: string | null
  /** 锁定级别：0 未锁定 */
  readonly lockLevel: number
  readonly lockUntil: string | null
  readonly manualUnlockBy: string | null
  readonly manualUnlockTime: string | null
  /** 是否永久有效：1 是、0 否 */
  readonly isPermanentValid: number
  readonly validFrom: string | null
  readonly validTo: string | null
  readonly createTime: string
  readonly updateTime: string
}

/** 分页结果，分页字段由后端以字符串返回 */
export interface MemberUserPage {
  readonly current: string
  readonly size: string
  readonly total: string
  readonly records: readonly MemberUser[]
}

/** 系统管理二级导航的栏目类型 */
export type SystemManagementKind = 'users' | 'roles' | 'config'

export interface SystemManagementSection {
  readonly path: string
  readonly label: string
  /** 面包屑里用的短名（顶栏「系统管理 / 用户管理」） */
  readonly shortLabel: string
  readonly kind: SystemManagementKind
  readonly description: string
  /** 接口尚未接入：导航置灰不可点 */
  readonly disabled?: boolean
}
