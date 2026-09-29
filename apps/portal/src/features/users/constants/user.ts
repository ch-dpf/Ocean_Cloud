import type { SystemManagementSection } from '../types/user'

/** 用户列表每页条数 */
export const USER_PAGE_SIZE = 10

/** 系统管理的二级导航：用户管理已接入，其余两项待接入 */
export const SYSTEM_MANAGEMENT_SECTIONS: readonly SystemManagementSection[] = [
  {
    path: '/system-management/users',
    label: '用户与组织',
    shortLabel: '用户管理',
    kind: 'users',
    description: '管理平台成员、账号状态与登录安全策略',
  },
  {
    path: '/system-management/roles',
    label: '角色与权限',
    shortLabel: '角色与权限',
    kind: 'roles',
    description: '配置角色权限和资源访问范围',
    disabled: true,
  },
  {
    path: '/system-management/config',
    label: '系统配置',
    shortLabel: '系统配置',
    kind: 'config',
    description: '维护基础参数、通知和安全策略',
    disabled: true,
  },
]

/** 账号状态：1 正常、0 已禁用；未命中的取值按原样展示 */
export const USER_STATUS_LABELS: Readonly<Record<number, string>> = {
  1: '正常',
  0: '已禁用',
}

/** 状态小方块的颜色；未命中的取值用兜底色 */
export const USER_STATUS_COLORS: Readonly<Record<number, string>> = {
  1: '#2fa84f',
  0: '#8394a0',
}

export const USER_STATUS_FALLBACK_COLOR = '#8394a0'

/** 锁定级别：0 未锁定；其余取值后端未给对照表，按原样展示 */
export const LOCK_LEVEL_LABELS: Readonly<Record<number, string>> = {
  0: '未锁定',
}

/** 是否永久有效：1 永久有效、0 限时有效 */
export const PERMANENT_VALID_LABELS: Readonly<Record<number, string>> = {
  1: '永久有效',
  0: '限时有效',
}

/** 角色类型；未命中的取值按原样展示 */
export const ROLE_TYPE_LABELS: Readonly<Record<string, string>> = {
  ADMIN: '管理员',
}

/** 角色代号；未命中的取值按原样展示 */
export const ROLE_CODE_LABELS: Readonly<Record<string, string>> = {
  SUPER_ADMIN: '超级管理员',
}
