import { useState } from 'react'
import { Form, Input, Select } from 'antd'
import type { TableColumnsType } from 'antd'
import styles from './PublicationTable.module.css'
import {
  SearchTable,
  STATUS_COLORS,
  TableActions,
  cellText,
  formatTime,
} from '@ocean-cloud/ui'
import type { StatusTone } from '@ocean-cloud/ui'
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
  /** 点击「停用」；不传时按钮仅作为占位展示 */
  readonly onDisable?: (record: PublicationRow) => void
}

/** 发布状态到调色板档次的映射；未命中的取值按「待处理」处理 */
const STATUS_TONE_BY_VALUE: Readonly<Record<string, StatusTone>> = {
  [PUBLICATION_STATUS.published]: 'done',
  [PUBLICATION_STATUS.disabled]: 'pending',
}

/** 操作列宽度：两个按钮（查看 / 停用） */
const ACTION_COLUMN_WIDTH = 100

/** 各视图的横向滚动宽度，等于该视图列宽合计 */
const SCROLL_X_BY_SCOPE: Readonly<Record<PublicationScope, number>> = {
  terrain: 1450,
  imagery: 1800,
  all: 1910,
}

/** 影像层级区间：minZoom ~ maxZoom，任一缺失都展示 — */
function formatZoomRange(record: PublicationRow): string {
  if (record.minZoom === null || record.maxZoom === null) return '—'
  return `${record.minZoom} ~ ${record.maxZoom}`
}

/** 复制结果的提示停留时长（毫秒） */
const COPY_HINT_MS = 1600

/** 复制结果的短暂提示：哪一行、成功与否 */
interface CopyHint {
  readonly rowKey: string
  readonly ok: boolean
}

/**
 * 写文本到剪贴板：优先用剪贴板 API，非安全上下文（http 访问）下它不存在或被拒，
 * 此时退回临时 textarea + execCommand 的老方案。返回是否写入成功，供界面给提示。
 */
async function writeToClipboard(value: string): Promise<boolean> {
  if (navigator.clipboard !== undefined) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // 继续尝试下面的兜底方案
    }
  }
  try {
    const textarea = document.createElement('textarea')
    textarea.value = value
    // 放在视口外并透明，避免影响布局与滚动
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}

/** 列定义；序号需要按当前页换算，因此每次渲染重建 */
function buildColumns(
  scope: PublicationScope,
  current: number,
  pageSize: number,
  onDisable: ((record: PublicationRow) => void) | undefined,
  copyHint: CopyHint | null,
  onCopy: (record: PublicationRow) => void,
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
            title: '瓦片编号方案',
            key: 'tileProfile',
            width: 100,
            render: (_, record) => cellText(record.tileProfile),
          },
          {
            title: '输出格式',
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
              background:
                STATUS_COLORS[STATUS_TONE_BY_VALUE[record.status] ?? 'pending'],
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
      className: styles.serviceUrl,
      // 整格可点击复制；没有地址时不可点，tooltip 仍展示原内容
      onCell: (record: PublicationRow) => ({
        onClick: record.serviceUrl ? () => onCopy(record) : undefined,
        title: record.serviceUrl
          ? `${record.serviceUrl}（点击复制）`
          : undefined,
      }),
      // 复制后地址照常展示，末尾追加一个小签表示结果
      render: (value: string, record: PublicationRow) => {
        const hint =
          copyHint !== null && copyHint.rowKey === record.rowKey
            ? copyHint
            : null
        return (
          <span className={styles.serviceUrlCell}>
            <span className={styles.serviceUrlText}>{cellText(value)}</span>
            {hint !== null && (
              <span
                className={hint.ok ? styles.copyTag : styles.copyFailTag}
                role="status"
              >
                {hint.ok ? '已复制' : '复制失败'}
              </span>
            )}
          </span>
        )
      },
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
      width: ACTION_COLUMN_WIDTH,
      // 横向滚动时固定在表格右侧，按钮始终可见
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          justify="evenly"
          actions={[
            {
              key: 'view',
              label: '查看',
              // 服务详情尚未接入，按钮先置灰占位
              disabled: true,
            },
            {
              key: 'disable',
              label: '停用',
              onClick:
                onDisable === undefined ? undefined : () => onDisable(record),
              // 只有已发布的服务可以停用，已停用的无需重复下发
              disabled:
                onDisable === undefined ||
                record.status !== PUBLICATION_STATUS.published,
            },
          ]}
        />
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
  onDisable,
}: PublicationTableProps) {
  // 复制结果的短暂提示；到点后自动清空
  const [copyHint, setCopyHint] = useState<CopyHint | null>(null)

  /** 点击服务地址格：复制后在本行闪现结果，避免依赖全局轻提示组件 */
  async function handleCopy(record: PublicationRow) {
    const ok = await writeToClipboard(record.serviceUrl)
    const hint: CopyHint = { rowKey: record.rowKey, ok }
    setCopyHint(hint)
    window.setTimeout(() => {
      // 只清掉这次设置的那条：期间又复制过别的行时，不提前清掉新的提示
      setCopyHint((previous) => (previous === hint ? null : previous))
    }, COPY_HINT_MS)
  }

  return (
    <SearchTable<PublicationRow>
      columns={buildColumns(
        scope,
        current,
        pageSize,
        onDisable,
        copyHint,
        handleCopy,
      )}
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
