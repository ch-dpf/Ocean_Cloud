import { Form, Input, Select } from 'antd'
import type { TableColumnsType } from 'antd'
import styles from './PublicationTable.module.css'
import { SearchTable } from '@ocean-cloud/ui'
import {
  PUBLICATION_STATUS,
  PUBLICATION_STATUS_LABELS,
  toPublicationKindLabel,
  toPublicationStatusLabel,
} from '../../constants/publication'
import type { PublicationRow, PublicationScope } from '../../types/publication'

interface PublicationTableProps {
  /** 当前查看范围，决定「服务类型」列与影像专属列是否展示 */
  readonly scope: PublicationScope
  readonly records: readonly PublicationRow[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly pageSize: number
  readonly total: number
  /** 页码或每页条数变化 */
  readonly onPageChange: (page: number, pageSize: number) => void
  /** 筛选条件变化（服务状态用于即时联动） */
  readonly onValuesChange?: (values: Record<string, unknown>) => void
  /** 点击搜索，回传当前表单值（服务编号在此刻生效） */
  readonly onSearch: (values: Record<string, unknown>) => void
  /** 点击重置（表单已重置后触发） */
  readonly onReset: () => void
}

/** 状态小方块的颜色；未命中的取值用兜底色 */
const STATUS_COLORS: Readonly<Record<string, string>> = {
  [PUBLICATION_STATUS.published]: '#2fa84f',
  [PUBLICATION_STATUS.disabled]: '#8394a0',
}

const STATUS_FALLBACK_COLOR = '#8394a0'

/** 地形视图与原列表一致；影像 / 全部视图列更多，横向宽度相应放宽 */
const SCROLL_X_BY_SCOPE: Readonly<Record<PublicationScope, number>> = {
  terrain: 1390,
  imagery: 1710,
  all: 1820,
}

/** 后端返回形如 2026-09-14T17:04:57.043286，展示为 2026-09-14 17:04:57 */
function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/** 空字符串 / null 统一展示为 — */
function cellText(value: string | null): string {
  return value ? value : '—'
}

/** 影像层级区间：minZoom ~ maxZoom，任一缺失都展示 — */
function formatZoomRange(record: PublicationRow): string {
  if (record.minZoom === null || record.maxZoom === null) return '—'
  return `${record.minZoom} ~ ${record.maxZoom}`
}

/** 列定义；序号需要按当前页换算，因此每次渲染重建 */
function buildColumns(
  scope: PublicationScope,
  current: number,
  pageSize: number,
): TableColumnsType<PublicationRow> {
  // 影像专属列：仅影像视图与全部视图展示；全部视图里地形行显示 —
  const imageryColumns: TableColumnsType<PublicationRow> =
    scope === 'terrain'
      ? []
      : [
          {
            title: '目标坐标系',
            key: 'targetCrs',
            width: 110,
            render: (_, record) => cellText(record.targetCrs),
          },
          {
            title: '服务格式',
            key: 'tileProfile',
            width: 100,
            render: (_, record) => cellText(record.tileProfile),
          },
          {
            title: '瓦片格式',
            key: 'outputFormat',
            width: 100,
            render: (_, record) => cellText(record.outputFormat),
          },
          {
            title: '层级',
            key: 'zoom',
            width: 100,
            render: (_, record) => formatZoomRange(record),
          },
        ]

  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    { title: '服务编号', dataIndex: 'serviceCode', width: 180, ellipsis: true },
    // 仅「全部服务」需要类型列区分地形 / 影像
    ...(scope === 'all'
      ? [
          {
            title: '服务类型',
            key: 'kind',
            width: 110,
            render: (_: unknown, record: PublicationRow) =>
              toPublicationKindLabel(record.kind),
          } as TableColumnsType<PublicationRow>[number],
        ]
      : []),
    {
      title: '状态',
      key: 'status',
      width: scope === 'terrain' ? 110 : 100,
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
    ...imageryColumns,
    {
      title: '服务地址',
      dataIndex: 'serviceUrl',
      width: scope === 'terrain' ? 300 : 260,
      ellipsis: true,
      render: (value: string) => cellText(value),
    },
    {
      title: '关联数据集',
      key: 'dataSetId',
      width: scope === 'terrain' ? 130 : 120,
      render: (_, record) => cellText(record.dataSetId),
    },
    {
      title: '源任务',
      key: 'sourceTaskId',
      width: 130,
      render: (_, record) => cellText(record.sourceTaskId),
    },
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
      width: scope === 'terrain' ? 130 : 100,
      // 横向滚动时固定在表格右侧，按钮始终可见
      fixed: 'right',
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
  scope,
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
    <SearchTable<PublicationRow>
      columns={buildColumns(scope, current, pageSize)}
      dataSource={records}
      rowKey="rowKey"
      loading={isLoading}
      total={total}
      current={current}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onValuesChange={onValuesChange}
      onSearch={onSearch}
      onReset={onReset}
      scrollX={SCROLL_X_BY_SCOPE[scope]}
      emptyText={error ?? undefined}
      // 默认只看已发布的服务（接口约定的默认筛选）
      searchInitialValues={{ status: PUBLICATION_STATUS.published }}
      searchFormItems={
        <>
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
