import { AppDialog } from '../AppDialog/AppDialog'
import styles from './UserDetailDialog.module.css'
import type { CurrentUser } from '../../hooks/useCurrentUser'

interface UserDetailDialogProps {
  /** 为 null 表示用户信息尚未取到，字段统一展示 — */
  readonly user: CurrentUser | null
  readonly onClose: () => void
}

interface DetailField {
  readonly label: string
  readonly value: string
}

/** 后端返回形如 2026-09-28T10:23:28.004396，展示为 2026-09-28 10:23:28 */
function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/** 可空文本统一展示为 — */
function text(value: string | null | undefined): string {
  return value ? value : '—'
}

/** 账号状态：1 正常、0 已禁用；其余取值按原样展示 */
function formatStatus(status: number | null | undefined): string {
  if (status === null || status === undefined) return '—'
  if (status === 1) return '正常'
  if (status === 0) return '已禁用'
  return String(status)
}

function buildFields(user: CurrentUser | null): readonly DetailField[] {
  return [
    { label: '用户名', value: text(user?.username) },
    { label: '真实姓名', value: text(user?.realName) },
    { label: '邮箱', value: text(user?.email) },
    { label: '手机号', value: text(user?.phone) },
    { label: '最近登录时间', value: formatTime(user?.lastLoginTime ?? null) },
    { label: '最近登录 IP', value: text(user?.lastLoginIp) },
    { label: '账号状态', value: formatStatus(user?.status) },
  ]
}

/** 用户详情：头像 + 账号字段一览。不展示密码、失败次数等敏感信息 */
export function UserDetailDialog({ user, onClose }: UserDetailDialogProps) {
  return (
    <AppDialog
      title="用户详情"
      onClose={onClose}
      closeOutside
      className={styles.dialog}
    >
      <div className={styles.identity}>
        <span className={styles.avatar}>
          {user?.avatar ? (
            <img src={user.avatar} alt="" className={styles.avatarImage} />
          ) : (
            <span className={styles.avatarFallback} aria-hidden="true">
              🧑
            </span>
          )}
        </span>
        <span className={styles.identityName}>
          {text(user?.realName ?? user?.username)}
        </span>
      </div>

      <dl className={styles.summary}>
        {buildFields(user).map((field) => (
          <div className={styles.summaryItem} key={field.label}>
            <dt>{field.label}</dt>
            <dd title={field.value}>{field.value}</dd>
          </div>
        ))}
      </dl>
    </AppDialog>
  )
}
