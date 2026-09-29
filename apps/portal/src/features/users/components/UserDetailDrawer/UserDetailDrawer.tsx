import { Drawer } from 'antd'
import styles from './UserDetailDrawer.module.css'
import {
  LOCK_LEVEL_LABELS,
  PERMANENT_VALID_LABELS,
  ROLE_CODE_LABELS,
  ROLE_TYPE_LABELS,
  USER_STATUS_LABELS,
} from '../../constants/user'
import type { MemberUser } from '../../types/user'

interface UserDetailDrawerProps {
  readonly user: MemberUser
  readonly onClose: () => void
}

interface DetailField {
  readonly label: string
  readonly value: string
}

interface DetailGroup {
  readonly title: string
  readonly fields: readonly DetailField[]
}

/** 后端返回形如 2026-09-28T15:41:49.082257，展示为 2026-09-28 15:41:49 */
function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/** 可空文本统一展示为 — */
function text(value: string | null | undefined): string {
  return value ? value : '—'
}

/** 数组字段：映射为中文后以「、」连接；空数组展示 — */
function listText(
  values: readonly string[] | null,
  labels?: Readonly<Record<string, string>>,
): string {
  if (values === null || values.length === 0) return '—'
  return values.map((value) => labels?.[value] ?? value).join('、')
}

/** 活跃会话展示为「当前 / 上限」；上限缺失时只展示当前值 */
function formatSessions(user: MemberUser): string {
  const active = user.activeSessionCount
  const max = user.maxConcurrentSessions
  if (active === null && max === null) return '—'
  if (max === null) return String(active)
  return `${active ?? 0} / ${max}`
}

/** 按分组组织字段，完整覆盖接口返回的非敏感信息 */
function buildGroups(user: MemberUser): readonly DetailGroup[] {
  return [
    {
      title: '基本信息',
      fields: [
        { label: '用户名', value: user.username },
        { label: '真实姓名', value: text(user.realName) },
        { label: '邮箱', value: text(user.email) },
        { label: '手机号', value: text(user.phone) },
        {
          label: '账号状态',
          value: USER_STATUS_LABELS[user.status] ?? String(user.status),
        },
      ],
    },
    {
      title: '角色与平台',
      fields: [
        {
          label: '角色类型',
          value: user.roleType
            ? (ROLE_TYPE_LABELS[user.roleType] ?? user.roleType)
            : '—',
        },
        { label: '角色', value: listText(user.roleCodes, ROLE_CODE_LABELS) },
        { label: '所属平台', value: listText(user.platformCodes) },
      ],
    },
    {
      title: '登录与安全',
      fields: [
        { label: '最近登录时间', value: formatTime(user.lastLoginTime) },
        { label: '最近登录 IP', value: text(user.lastLoginIp) },
        { label: '活跃会话', value: formatSessions(user) },
        {
          label: '锁定级别',
          value: LOCK_LEVEL_LABELS[user.lockLevel] ?? String(user.lockLevel),
        },
        { label: '锁定至', value: formatTime(user.lockUntil) },
        {
          label: '密码错误次数',
          value: String(user.failedPasswordAttempts ?? 0),
        },
        {
          label: '上次密码错误',
          value: formatTime(user.lastPasswordErrorTime),
        },
        { label: '手动解锁人', value: text(user.manualUnlockBy) },
        { label: '手动解锁时间', value: formatTime(user.manualUnlockTime) },
      ],
    },
    {
      title: '有效期与时间',
      fields: [
        {
          label: '有效期',
          value:
            PERMANENT_VALID_LABELS[user.isPermanentValid] ??
            String(user.isPermanentValid),
        },
        { label: '生效时间', value: formatTime(user.validFrom) },
        { label: '失效时间', value: formatTime(user.validTo) },
        { label: '创建时间', value: formatTime(user.createTime) },
        { label: '更新时间', value: formatTime(user.updateTime) },
      ],
    },
  ]
}

/** 用户详情抽屉：列表只展示常用字段，账号安全等完整信息在这里展开 */
export function UserDetailDrawer({ user, onClose }: UserDetailDrawerProps) {
  const name = user.realName || user.username
  return (
    <Drawer
      open
      title="用户详情"
      placement="right"
      width={440}
      onClose={onClose}
      className={styles.drawer}
    >
      <div className={styles.identity}>
        <span className={styles.avatar}>
          {user.avatar ? (
            <img src={user.avatar} alt="" className={styles.avatarImage} />
          ) : (
            // 头像为空时用默认头像
            <span className={styles.avatarFallback} aria-hidden="true">
              🧑
            </span>
          )}
        </span>
        <span className={styles.identityCopy}>
          <strong title={name}>{name}</strong>
          <small>{user.username}</small>
        </span>
      </div>

      {buildGroups(user).map((group) => (
        <section className={styles.group} key={group.title}>
          <h3 className={styles.groupTitle}>{group.title}</h3>
          <dl className={styles.fields}>
            {group.fields.map((field) => (
              <div className={styles.field} key={field.label}>
                <dt>{field.label}</dt>
                <dd title={field.value}>{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Drawer>
  )
}
