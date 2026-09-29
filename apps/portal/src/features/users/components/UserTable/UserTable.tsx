import { useState } from 'react'
import type { TableColumnsType } from 'antd'
import { SearchTable } from '@ocean-cloud/ui'
import styles from './UserTable.module.css'
import {
  ROLE_CODE_LABELS,
  USER_PAGE_SIZE,
  USER_STATUS_COLORS,
  USER_STATUS_FALLBACK_COLOR,
  USER_STATUS_LABELS,
} from '../../constants/user'
import { useUserPage } from '../../hooks/useUserPage'
import { UserDetailDrawer } from '../UserDetailDrawer/UserDetailDrawer'
import type { MemberUser } from '../../types/user'

/** 列宽合计 1050 */
const SCROLL_X = 1050

/** 后端返回形如 2026-09-28T15:41:49.082257，展示为 2026-09-28 15:41:49 */
function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/** 角色展示：角色码映射为中文后以「、」连接；无角色展示 — */
function formatRoles(record: MemberUser): string {
  const codes = record.roleCodes ?? []
  if (codes.length === 0) return '—'
  return codes.map((code) => ROLE_CODE_LABELS[code] ?? code).join('、')
}

/** 活跃会话展示为「当前 / 上限」；上限缺失时只展示当前值 */
function formatSessions(record: MemberUser): string {
  const active = record.activeSessionCount
  const max = record.maxConcurrentSessions
  if (active === null && max === null) return '—'
  if (max === null) return String(active)
  return `${active ?? 0} / ${max}`
}

/** 用户单元格：头像 + 姓名（无姓名时回落到用户名） */
function UserCell({ record }: { readonly record: MemberUser }) {
  const name = record.realName || record.username
  return (
    <span className={styles.user}>
      <span className={styles.avatar}>
        {record.avatar ? (
          <img src={record.avatar} alt="" className={styles.avatarImage} />
        ) : (
          // 头像为空时用默认头像
          <span className={styles.avatarFallback} aria-hidden="true">
            🧑
          </span>
        )}
      </span>
      <span className={styles.userName} title={name}>
        {name}
      </span>
    </span>
  )
}

/** 状态色块：正常为绿，已禁用为灰 */
function StatusCell({ status }: { readonly status: number }) {
  return (
    <span className={styles.status}>
      <span
        className={styles.statusSquare}
        style={{
          background: USER_STATUS_COLORS[status] ?? USER_STATUS_FALLBACK_COLOR,
        }}
        aria-hidden="true"
      />
      {USER_STATUS_LABELS[status] ?? status}
    </span>
  )
}

/** 列定义；序号与操作列依赖外部传入的值，因此每次渲染重建 */
function buildColumns(
  current: number,
  pageSize: number,
  onView: (record: MemberUser) => void,
): TableColumnsType<MemberUser> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    {
      title: '用户',
      key: 'user',
      width: 200,
      ellipsis: true,
      render: (_, record) => <UserCell record={record} />,
    },
    { title: '用户名', dataIndex: 'username', width: 150, ellipsis: true },
    {
      title: '角色',
      key: 'roles',
      width: 160,
      ellipsis: true,
      render: (_, record) => {
        const roles = formatRoles(record)
        return <span title={roles}>{roles}</span>
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_, record) => <StatusCell status={record.status} />,
    },
    {
      title: '最近登录',
      key: 'lastLoginTime',
      width: 170,
      render: (_, record) => formatTime(record.lastLoginTime),
    },
    {
      title: '活跃会话',
      key: 'sessions',
      width: 110,
      render: (_, record) => formatSessions(record),
    },
    {
      title: '操作',
      key: 'action',
      width: 90,
      // 横向滚动时固定在表格右侧，按钮始终可见
      fixed: 'right',
      render: (_, record) => (
        <button
          type="button"
          className={styles.actionButton}
          onClick={() => onView(record)}
        >
          详情
        </button>
      ),
    },
  ]
}

/**
 * 用户列表：精简表格只展示常用字段，账号安全等完整信息在详情抽屉里。
 * 查询接口目前只有 current / size 两个参数，因此不渲染搜索栏。
 */
export function UserTable() {
  const [pageSize, setPageSize] = useState(USER_PAGE_SIZE)
  const [detailUser, setDetailUser] = useState<MemberUser | null>(null)
  const { records, total, current, isLoading, error, goToPage } =
    useUserPage(pageSize)

  /** 每页条数变化时由 hook 回到第 1 页 */
  function handlePageChange(page: number, size: number) {
    setPageSize(size)
    goToPage(page)
  }

  return (
    <>
      <SearchTable<MemberUser>
        columns={buildColumns(current, pageSize, setDetailUser)}
        dataSource={records}
        rowKey="id"
        loading={isLoading}
        total={total}
        current={current}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        scrollX={SCROLL_X}
        emptyText={error ?? undefined}
      />
      {detailUser !== null && (
        <UserDetailDrawer
          user={detailUser}
          onClose={() => setDetailUser(null)}
        />
      )}
    </>
  )
}
