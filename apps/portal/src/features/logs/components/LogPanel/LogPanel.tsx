import { useState } from 'react'
import { Form, Input, Select } from 'antd'
import type { TableColumnType, TableColumnsType } from 'antd'
import { ConfirmDialog, SearchTable, TableActions } from '@ocean-cloud/ui'
import styles from './LogPanel.module.css'
import { LOG_PAGE_SIZE } from '../../constants/log'
import { useLogPage } from '../../hooks/useLogPage'
import type { LogPage, LogQueryParams } from '../../types/log'

interface LogPanelProps<T extends { readonly id: string }> {
  /** 列定义工厂：序号列需要按当前页换算，所以由面板把分页信息回传 */
  readonly columns: (current: number, pageSize: number) => TableColumnsType<T>
  readonly fetchPage: (
    query: LogQueryParams,
    signal?: AbortSignal,
  ) => Promise<LogPage<T>>
  readonly statusOptions: readonly {
    readonly value: number
    readonly label: string
  }[]
  /** 列宽合计，作为表格最小宽度 */
  readonly scrollX: number
  /** 删除单条日志；不传时不渲染操作列 */
  readonly onDelete?: (id: string) => Promise<void>
}

/** 把 datetime-local 的值（2026-09-15T10:30）转成后端需要的 2026-09-15 10:30:00 */
function toDateTime(value: unknown): string | undefined {
  if (typeof value !== 'string' || value === '') return undefined
  return `${value.replace('T', ' ')}:00`
}

function toText(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * 日志面板：筛选栏（用户名、时间范围、状态）+ 表格 + 分页。
 * 点击搜索才提交筛选条件，避免输入用户名时每敲一个字就发一次请求。
 * 传入 onDelete 时在表格末尾追加「操作」列（固定在右侧）。
 */
export function LogPanel<T extends { readonly id: string }>({
  columns,
  fetchPage,
  statusOptions,
  scrollX,
  onDelete,
}: LogPanelProps<T>) {
  const [form] = Form.useForm()
  const [pageSize, setPageSize] = useState(LOG_PAGE_SIZE)
  const [filters, setFilters] = useState<{
    readonly username?: string
    readonly startTime?: string
    readonly endTime?: string
    readonly status?: number
  }>({})
  // 待确认删除的记录，以及正在删除的记录 id（按钮显示「删除中…」）
  const [pendingDelete, setPendingDelete] = useState<T | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const { records, total, current, isLoading, error, goToPage, refresh } =
    useLogPage<T>({
      fetchPage,
      username: filters.username,
      startTime: filters.startTime,
      endTime: filters.endTime,
      status: filters.status,
      size: pageSize,
    })

  function handleSearch() {
    const values: Record<string, unknown> = form.getFieldsValue()
    setFilters({
      username: toText(values.username),
      startTime: toDateTime(values.startTime),
      endTime: toDateTime(values.endTime),
      status: typeof values.status === 'number' ? values.status : undefined,
    })
    // 条件没变时也重新查询一次，符合「点了搜索就该刷新」的预期
    refresh()
  }

  function handleReset() {
    setFilters({})
    refresh()
  }

  /** 每页条数变化时由 hook 回到第 1 页 */
  function handlePageChange(page: number, size: number) {
    setPageSize(size)
    goToPage(page)
  }

  /** 删除日志：成功后按当前条件重新查询；失败提示由 RequestErrorNotice 统一展示 */
  async function handleDelete() {
    if (pendingDelete === null || onDelete === undefined) return
    setDeletingId(pendingDelete.id)
    try {
      await onDelete(pendingDelete.id)
      refresh()
    } finally {
      setDeletingId(null)
    }
  }

  // 操作列由面板统一追加（固定在表格右侧），各日志表只需传入删除函数
  const actionColumn: TableColumnType<T> = {
    title: '操作',
    key: 'action',
    width: 110,
    fixed: 'right',
    render: (_, record) => (
      <TableActions
        actions={[
          {
            key: 'delete',
            label: deletingId === record.id ? '删除中…' : '删除',
            tone: 'danger',
            onClick: () => setPendingDelete(record),
            disabled: deletingId === record.id,
          },
        ]}
      />
    ),
  }
  const tableColumns =
    onDelete === undefined
      ? columns(current, pageSize)
      : [...columns(current, pageSize), actionColumn]

  return (
    <>
      <SearchTable<T>
        columns={tableColumns}
        dataSource={records}
        rowKey="id"
        loading={isLoading}
        total={total}
        current={current}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        searchForm={form}
        onSearch={handleSearch}
        onReset={handleReset}
        scrollX={scrollX}
        emptyText={error ?? undefined}
        searchFormItems={
          <>
            <Form.Item label="用户名" name="username">
              <Input placeholder="请输入用户名" allowClear />
            </Form.Item>
            <Form.Item label="开始时间" name="startTime">
              <input type="datetime-local" className={styles.dateInput} />
            </Form.Item>
            <Form.Item label="结束时间" name="endTime">
              <input type="datetime-local" className={styles.dateInput} />
            </Form.Item>
            <Form.Item label="状态" name="status">
              <Select
                placeholder="全部状态"
                allowClear
                style={{ width: 130 }}
                options={[...statusOptions]}
              />
            </Form.Item>
          </>
        }
      />
      {pendingDelete !== null && (
        <ConfirmDialog
          title="删除日志"
          message="确定删除这条日志吗？该操作不可撤销。"
          confirmLabel="删除"
          danger
          onConfirm={handleDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </>
  )
}
