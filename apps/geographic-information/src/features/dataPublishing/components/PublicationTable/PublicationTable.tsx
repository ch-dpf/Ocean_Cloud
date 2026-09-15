import { Form, Input, Select } from 'antd'
import type { TableColumnsType } from 'antd'
import styles from './PublicationTable.module.css'
import { SearchTable } from '@ocean-cloud/ui'
import {
  PUBLICATION_STATUS,
  PUBLICATION_STATUS_LABELS,
  toPublicationStatusLabel,
} from '../../constants/publication'
import type { TerrainPublication } from '../../types/publication'

interface PublicationTableProps {
  readonly records: readonly TerrainPublication[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly pageSize: number
  readonly total: number
  /** 页码或每页条数变化 */
  readonly onPageChange: (page: number, pageSize: number) => void
  /** 筛选条件变化（服务状态用于请求参数） */
  readonly onValuesChange?: (values: Record<string, unknown>) => void
  /** 点击搜索 */
  readonly onSearch: () => void
  /** 点击重置（表单已重置后触发） */
  readonly onReset: () => void
}

/** 状态小方块的颜色；未命中的取值用兜底色 */
const STATUS_COLORS: Readonly<Record<string, string>> = {
  [PUBLICATION_STATUS.published]: '#2fa84f',
  [PUBLICATION_STATUS.disabled]: '#8394a0',
}

const STATUS_FALLBACK_COLOR = '#8394a0'

/** 列宽合计 1390，与下方 scrollX 保持一致 */
const SCROLL_X = 1390

/** 后端返回形如 2026-09-14T17:04:57.043286，展示为 2026-09-14 17:04:57 */
function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/** 列定义；序号需要按当前页换算，因此每次渲染重建 */
function buildColumns(
  current: number,
  pageSize: number,
): TableColumnsType<TerrainPublication> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    { title: '服务编号', dataIndex: 'serviceCode', width: 180, ellipsis: true },
    {
      title: '状态',
      key: 'status',
      width: 110,
      render: (_, record) => (
        <span className={styles.status}>
          <span
            className={styles.statusSquare}
            style={{
              background: STATUS_COLORS[record.status] ?? STATUS_FALLBACK_COLOR,
            }}
            aria-hidden="true"
          />
          {toPublicationStatusLabel(record.status)}
        </span>
      ),
    },
    { title: '服务地址', dataIndex: 'serviceUrl', width: 300, ellipsis: true },
    { title: '关联数据集', dataIndex: 'dataSetId', width: 130 },
    { title: '源任务', dataIndex: 'sourceTaskId', width: 130 },
    {
      title: '发布时间',
      key: 'publishTime',
      width: 170,
      render: (_, record) => formatTime(record.publishTime),
    },
    {
      title: '更新时间',
      key: 'updateTime',
      width: 170,
      render: (_, record) => formatTime(record.updateTime),
    },
    {
      title: '操作',
      key: 'action',
      width: 130,
      render: () => (
        // 服务详情尚未接入，按钮先置灰占位
        <button type="button" className={styles.actionButton} disabled>
          查看
        </button>
      ),
    },
  ]
}

export function PublicationTable({
  records,
  isLoading,
  error,
  current,
  pageSize,
  total,
  onPageChange,
  onValuesChange,
  onSearch,
  onReset,
}: PublicationTableProps) {
  return (
    <SearchTable<TerrainPublication>
      columns={buildColumns(current, pageSize)}
      dataSource={records}
      rowKey="id"
      loading={isLoading}
      total={total}
      current={current}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onValuesChange={onValuesChange}
      onSearch={onSearch}
      onReset={onReset}
      scrollX={SCROLL_X}
      emptyText={error ?? undefined}
      // 默认只看已发布的服务（接口约定的默认筛选）
      searchInitialValues={{ status: PUBLICATION_STATUS.published }}
      searchFormItems={
        <>
          {/* 服务编号暂未接入接口参数，仅保留输入状态 */}
          <Form.Item label="服务编号" name="serviceCode">
            <Input placeholder="请输入服务编号" allowClear />
          </Form.Item>
          <Form.Item label="服务状态" name="status">
            <Select
              placeholder="全部状态"
              allowClear
              style={{ width: 140 }}
              options={Object.entries(PUBLICATION_STATUS_LABELS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </Form.Item>
        </>
      }
    />
  )
}
