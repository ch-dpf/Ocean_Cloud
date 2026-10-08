import { Form, Input, Select } from 'antd'
import type { TableColumnsType } from 'antd'
import styles from './FileMetaTable.module.css'
import { SearchTable } from '@ocean-cloud/ui'
import {
  DATASET_CATEGORY_LABELS,
  FILE_FORMAT_OPTIONS,
  toProcessLabel,
} from '../../constants/dataset'
import type { FileMeta, FileMetaFilters } from '../../types/fileMeta'

/** 操作列按钮配置 */
export interface FileRowAction {
  readonly label: string
  /** 未提供时按钮仅作为占位展示（例如恢复接口尚未接入） */
  readonly onClick?: (record: FileMeta) => void
  /** 正在处理中的记录 id：该行按钮显示"处理中…" */
  readonly pendingId?: string | null
  /** 整体禁用；也可传函数按行判断（例如只开放地形数据的处理） */
  readonly disabled?: boolean | ((record: FileMeta) => boolean)
  /** 按钮色调：danger 为红色（删除类），默认蓝色 */
  readonly tone?: 'default' | 'danger'
}

interface FileMetaTableProps {
  readonly records: readonly FileMeta[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly pageSize: number
  readonly total: number
  /** 页码或每页条数变化 */
  readonly onPageChange: (page: number, pageSize: number) => void
  /** 操作列按钮；不传时不渲染操作按钮 */
  readonly actions?: readonly FileRowAction[]
  /** 点击搜索，回传本次筛选条件（已去除空值） */
  readonly onSearch: (filters: FileMetaFilters) => void
  /** 点击重置（表单已重置后触发） */
  readonly onReset: () => void
}

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/** 后端返回字节数字符串，展示为带单位的可读大小 */
function formatFileSize(sizeBytes: string): string {
  const bytes = Number(sizeBytes)
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < SIZE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${unit === 0 ? String(value) : value.toFixed(1)} ${SIZE_UNITS[unit]}`
}

/** 后端返回形如 2026-09-11T20:55:43.623167，展示为 2026-09-11 20:55:43 */
function formatTime(value: string): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/** 列定义；序号需要按当前页换算，因此每次渲染重建 */
function buildColumns(
  current: number,
  pageSize: number,
  actions: readonly FileRowAction[] | undefined,
): TableColumnsType<FileMeta> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    {
      title: '文件名',
      dataIndex: 'originalName',
      width: 120,
      ellipsis: true,
    },
    {
      title: '文件路径',
      dataIndex: 'storageKey',
      width: 260,
      ellipsis: true,
    },
    {
      title: '上传时间',
      key: 'createTime',
      width: 170,
      render: (_, record) => formatTime(record.createTime),
    },
    {
      title: '数据规模',
      key: 'sizeBytes',
      width: 110,
      render: (_, record) => formatFileSize(record.sizeBytes),
    },
    {
      title: '数据类型',
      key: 'categoryId',
      width: 120,
      render: (_, record) => DATASET_CATEGORY_LABELS[Number(record.categoryId)],
    },
    {
      title: '数据格式',
      dataIndex: 'extension',
      width: 110,
    },
    {
      title: '处理类型',
      key: 'process',
      width: 130,
      render: (_, record) => toProcessLabel(Number(record.categoryId)),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      // 横向滚动时固定在表格右侧，按钮始终可见
      fixed: 'right',
      render: (_, record) => (
        <span className={styles.actionCell}>
          {actions?.map((item) => {
            const isPending = item.pendingId === record.id
            const isRowDisabled =
              typeof item.disabled === 'function'
                ? item.disabled(record)
                : item.disabled === true
            return (
              <button
                key={item.label}
                type="button"
                className={`${styles.actionButton}${
                  item.tone === 'danger' ? '' : ` ${styles.actionButtonDefault}`
                }`}
                onClick={
                  item.onClick === undefined
                    ? undefined
                    : () => item.onClick?.(record)
                }
                disabled={isRowDisabled || isPending}
              >
                {isPending ? '处理中…' : item.label}
              </button>
            )
          })}
        </span>
      ),
    },
  ]
}

/** 表单值转查询条件：空值不提交，文件名去除首尾空格 */
function toFilters(values: Record<string, unknown>): FileMetaFilters {
  const originalName =
    typeof values.originalName === 'string' ? values.originalName.trim() : ''
  const extension = typeof values.extension === 'string' ? values.extension : ''
  return {
    ...(originalName === '' ? {} : { originalName }),
    ...(extension === '' ? {} : { extension }),
  }
}

export function FileMetaTable({
  records,
  isLoading,
  error,
  current,
  pageSize,
  total,
  onPageChange,
  actions,
  onSearch,
  onReset,
}: FileMetaTableProps) {
  return (
    <SearchTable<FileMeta>
      columns={buildColumns(current, pageSize, actions)}
      dataSource={records}
      rowKey="id"
      loading={isLoading}
      total={total}
      current={current}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onSearch={(values) => onSearch(toFilters(values))}
      onReset={onReset}
      // 列宽合计，保证窄屏时横向滚动、长文本按列宽截断
      scrollX={1400}
      emptyText={error ?? undefined}
      searchFormItems={
        <>
          <Form.Item label="数据格式" name="extension">
            <Select
              placeholder="全部类型"
              allowClear
              style={{ width: 140 }}
              options={FILE_FORMAT_OPTIONS.map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          <Form.Item label="文件名" name="originalName">
            <Input placeholder="请输入文件名" allowClear />
          </Form.Item>
        </>
      }
    />
  )
}
