import { Form, Input, Select } from 'antd'
import type { TableColumnsType } from 'antd'
import {
  SearchTable,
  TableActions,
  formatFileSize,
  formatTime,
  type TableAction,
} from '@ocean-cloud/ui'
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
  /**
   * 渲染成 <a> 直接发起导航下载（浏览器原生落盘，不经 axios）。
   * 与 onClick 互斥，pendingId / disabled 对它均不生效——导航请求带不上请求头，也回传不了状态
   */
  readonly link?: (record: FileMeta) => {
    readonly href: string
    readonly download: string
  }
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
        <TableActions
          justify="evenly"
          actions={(actions ?? []).map((item): TableAction => {
            const isPending = item.pendingId === record.id
            const isRowDisabled =
              typeof item.disabled === 'function'
                ? item.disabled(record)
                : item.disabled === true
            const link = item.link?.(record)
            return {
              key: item.label,
              label: isPending ? '处理中…' : item.label,
              tone: item.tone === 'danger' ? 'danger' : 'default',
              disabled: isRowDisabled || isPending,
              href: link?.href,
              download: link?.download,
              onClick:
                item.onClick === undefined
                  ? undefined
                  : () => item.onClick?.(record),
            }
          })}
        />
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
