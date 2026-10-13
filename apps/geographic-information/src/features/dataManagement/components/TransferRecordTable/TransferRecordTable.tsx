import { Form, Input, Select } from 'antd'
import type { TableColumnsType } from 'antd'
import styles from './TransferRecordTable.module.css'
import {
  SearchTable,
  StatusDot,
  TableActions,
  formatTime,
  type StatusTone,
} from '@ocean-cloud/ui'
import {
  OPERATION_TYPE_OPTIONS,
  toOperationTypeLabel,
  toTaskStatusLabel,
} from '../../constants/task'
import type { TransferFilters, TransferRecord } from '../../types/fileTransfer'

interface TransferRecordTableProps {
  readonly records: readonly TransferRecord[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly pageSize: number
  readonly total: number
  /** 页码或每页条数变化 */
  readonly onPageChange: (page: number, pageSize: number) => void
  /** 数据集下拉选项：来自全量数据集目录，找不到名称时用 id 兜底 */
  readonly datasetOptions: readonly {
    readonly value: string
    readonly label: string
  }[]
  /** 点击搜索，回传本次筛选条件（已去除空值） */
  readonly onSearch: (filters: TransferFilters) => void
  /** 点击重置（表单已重置后触发） */
  readonly onReset: () => void
  /** 点击详情 */
  readonly onDetail: (record: TransferRecord) => void
}

/**
 * 状态 → 语义档次（业务映射保留）；具体颜色由 StatusDot 从全局调色板取，
 * 未识别的取值兜底到 pending（其色值即全局兜底色）。
 */
const STATUS_TONES: Readonly<Record<string, StatusTone>> = {
  COMPLETED: 'done',
  RUNNING: 'running',
  QUEUED: 'pending',
  PARTIAL_FAILED: 'warning',
  FAILED: 'failed',
}

/** 待处理与失败数合成一列，避免列太多 */
function formatCounts(record: TransferRecord): string {
  const failed = record.failedCount > 0 ? `（失败 ${record.failedCount}）` : ''
  return `${record.completedCount} / ${record.totalCount}${failed}`
}

/** 列定义；序号需要按当前页换算，因此每次渲染重建；列宽合计 1430 */
function buildColumns(
  current: number,
  pageSize: number,
  onDetail: (record: TransferRecord) => void,
): TableColumnsType<TransferRecord> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    { title: '记录编号', dataIndex: 'recordNo', width: 240, ellipsis: true },
    {
      title: '数据集',
      key: 'dataSetName',
      width: 200,
      ellipsis: true,
      render: (_, record) => record.dataSetName ?? record.dataSetId,
    },
    {
      title: '传输类型',
      key: 'operationType',
      width: 110,
      render: (_, record) => toOperationTypeLabel(record.operationType),
    },
    {
      title: '状态',
      key: 'recordStatus',
      width: 120,
      render: (_, record) => (
        <StatusDot
          tone={STATUS_TONES[record.recordStatus] ?? 'pending'}
          label={toTaskStatusLabel(record.recordStatus)}
        />
      ),
    },
    {
      title: '进度',
      key: 'progress',
      width: 90,
      render: (_, record) => `${record.progress}%`,
    },
    {
      title: '已完成 / 总数',
      key: 'counts',
      width: 150,
      render: (_, record) => formatCounts(record),
    },
    {
      title: '开始时间',
      key: 'startTime',
      width: 170,
      render: (_, record) => formatTime(record.startTime),
    },
    {
      title: '结束时间',
      key: 'finishTime',
      width: 170,
      render: (_, record) => formatTime(record.finishTime),
    },
    {
      title: '操作',
      key: 'action',
      width: 110,
      // 横向滚动时固定在表格右侧，按钮始终可见
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'detail',
              label: '详情',
              onClick: () => onDetail(record),
            },
          ]}
        />
      ),
    },
  ]
}

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * 创建时间筛选只让用户选年月日，提交时补上时间：
 * 起点取当天 00:00:00，终点取当天 23:59:59，保证整天都被包含。
 */
function toDayStart(value: string): string | undefined {
  return value === '' ? undefined : `${value}T00:00:00`
}

function toDayEnd(value: string): string | undefined {
  return value === '' ? undefined : `${value}T23:59:59`
}

/** 表单值转查询条件：空值不提交 */
function toFilters(values: Record<string, unknown>): TransferFilters {
  const recordNo = toText(values.recordNo)
  const operationType = toText(values.operationType)
  const dataSetId = typeof values.dataSetId === 'string' ? values.dataSetId : ''
  const createTimeStart = toDayStart(toText(values.createTimeStart))
  const createTimeEnd = toDayEnd(toText(values.createTimeEnd))
  return {
    ...(recordNo === '' ? {} : { recordNo }),
    ...(operationType === '' ? {} : { operationType }),
    ...(dataSetId === '' ? {} : { dataSetId }),
    ...(createTimeStart === undefined ? {} : { createTimeStart }),
    ...(createTimeEnd === undefined ? {} : { createTimeEnd }),
  }
}

/** 传输记录：按记录编号、传输类型、数据集与创建时间筛选 */
export function TransferRecordTable({
  records,
  isLoading,
  error,
  current,
  pageSize,
  total,
  onPageChange,
  datasetOptions,
  onSearch,
  onReset,
  onDetail,
}: TransferRecordTableProps) {
  return (
    <SearchTable<TransferRecord>
      columns={buildColumns(current, pageSize, onDetail)}
      dataSource={records}
      rowKey="id"
      loading={isLoading}
      total={total}
      current={current}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onSearch={(values) => onSearch(toFilters(values))}
      onReset={onReset}
      scrollX={1430}
      emptyText={error ?? undefined}
      searchFormItems={
        <>
          <Form.Item label="记录编号" name="recordNo">
            <Input placeholder="请输入记录编号" allowClear />
          </Form.Item>
          <Form.Item label="传输类型" name="operationType">
            <Select
              placeholder="全部类型"
              allowClear
              style={{ width: 140 }}
              options={[...OPERATION_TYPE_OPTIONS]}
            />
          </Form.Item>
          <Form.Item label="数据集" name="dataSetId">
            <Select
              placeholder="全部数据集"
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 180 }}
              options={[...datasetOptions]}
            />
          </Form.Item>
          <Form.Item label="创建时间起" name="createTimeStart">
            <input type="date" className={styles.dateInput} />
          </Form.Item>
          <Form.Item label="创建时间止" name="createTimeEnd">
            <input type="date" className={styles.dateInput} />
          </Form.Item>
        </>
      }
    />
  )
}
