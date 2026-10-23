import { Table } from 'antd'
import type { TableColumnsType } from 'antd'
import type { Key } from 'react'
import { formatFileSize } from '@ocean-cloud/ui'
import type { FileMeta } from '../../types/fileMeta'
import { MAP_FILTER_PAGE_SIZE } from '../../hooks/useMapBoundsSearch'
import styles from './MapFilterDialog.module.css'

interface MapFilterResultTableProps {
  readonly records: readonly FileMeta[]
  readonly total: number
  readonly current: number
  readonly loading: boolean
  readonly error: string | null
  readonly hasQuery: boolean
  readonly selectedIds: readonly string[]
  readonly onPageChange: (page: number) => void
  readonly onSelectionChange: (
    keys: readonly string[],
    rows: readonly FileMeta[],
  ) => void
}

const columns: TableColumnsType<FileMeta> = [
  {
    title: '文件名',
    dataIndex: 'originalName',
    ellipsis: true,
    render: (value: string) => <span title={value}>{value}</span>,
  },
  { title: '格式', dataIndex: 'extension', width: 64 },
  {
    title: '大小',
    dataIndex: 'sizeBytes',
    width: 88,
    render: (value: string) => formatFileSize(value),
  },
]

/** 框选查询结果：支持当前页与跨页勾选，父组件负责保存已选文件元数据。 */
export function MapFilterResultTable({
  records,
  total,
  current,
  loading,
  error,
  hasQuery,
  selectedIds,
  onPageChange,
  onSelectionChange,
}: MapFilterResultTableProps) {
  return (
    <div className={styles.resultTable}>
      <Table<FileMeta>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={records}
        loading={loading}
        scroll={{ x: 420 }}
        locale={{
          emptyText:
            error ?? (hasQuery ? '未查询到文件。' : '请先框选范围并点击查询。'),
        }}
        rowSelection={{
          selectedRowKeys: [...selectedIds],
          preserveSelectedRowKeys: true,
          onChange: (keys: Key[], rows) =>
            onSelectionChange(keys.map(String), rows),
        }}
        pagination={{
          current,
          pageSize: MAP_FILTER_PAGE_SIZE,
          total,
          size: 'small',
          showSizeChanger: false,
          showLessItems: true,
          showTotal: (value) => `共 ${value} 条`,
          onChange: onPageChange,
        }}
      />
    </div>
  )
}
