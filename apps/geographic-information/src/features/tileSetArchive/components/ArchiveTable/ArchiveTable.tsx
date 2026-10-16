import type { TableColumnsType } from 'antd'
import styles from './ArchiveTable.module.css'
import {
  PROGRESS_COLORS,
  STATUS_FALLBACK_COLOR,
  SearchTable,
  TableActions,
  formatFileSize,
  formatTime,
} from '@ocean-cloud/ui'
import { toProcessingTypeLabel } from '../../../dataManagement/constants/task'
import { canRetryArchive, toArchiveStatusLabel } from '../../constants/archive'
import { buildArchiveDownloadUrl } from '../../services/archiveService'
import type { TileSetArchive } from '../../types/archive'

/**
 * 表格行 = REST 归档记录 + 该归档最新的 WS 进度。
 * 实时进度由页面按归档编号合并进来，表格自己不订阅长连接
 */
export interface ArchiveRow extends TileSetArchive {
  /** 进行中归档的实时百分比（0-100）；没有 WS 帧时为 null */
  readonly livePercent: number | null
  /** 帧里当前阶段的文案（currentStage.message）；没有 WS 帧时为空串 */
  readonly liveStageText: string
}

interface ArchiveTableProps {
  readonly records: readonly ArchiveRow[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly pageSize: number
  readonly total: number
  /** 页码或每页条数变化 */
  readonly onPageChange: (page: number, pageSize: number) => void
  /** 点击详情 */
  readonly onDetail: (record: ArchiveRow) => void
  /** 点击重试；不传时按钮仅作为占位展示 */
  readonly onRetry?: (record: ArchiveRow) => void
  /** 正在重试的归档编号：该行按钮显示「重试中…」 */
  readonly retryingNo?: string | null
}

/**
 * 进度条颜色：与任务列表同一套映射，颜色一律由 REST 的 archiveStatus 决定，
 * 未识别的状态用全局兜底色。归档只有四种状态，没有「部分失败」
 */
const PROGRESS_BAR_COLORS: Readonly<Record<string, string>> = {
  QUEUED: PROGRESS_COLORS.running,
  RUNNING: PROGRESS_COLORS.running,
  COMPLETED: PROGRESS_COLORS.done,
  FAILED: PROGRESS_COLORS.failed,
}

/**
 * 进度列的展示值：进行中（排队 / 打包）才用 WS 帧的实时百分比与阶段文案，
 * 终态整条填满表示已结束，其中已完成带 100%，失败类不再显示进度。
 */
function progressDisplay(row: ArchiveRow): {
  readonly percent: number
  readonly color: string
  readonly label: string
} {
  const color = PROGRESS_BAR_COLORS[row.archiveStatus] ?? STATUS_FALLBACK_COLOR
  if (row.archiveStatus === 'QUEUED' || row.archiveStatus === 'RUNNING') {
    // 还没收到帧时退回 REST 的 progress，避免条一直停在 0
    const raw = row.livePercent ?? Number(row.progress)
    const percent = Number.isFinite(raw)
      ? Math.min(100, Math.max(0, Math.round(raw)))
      : 0
    const stage =
      row.liveStageText === ''
        ? toArchiveStatusLabel(row.archiveStatus)
        : row.liveStageText
    return { percent, color, label: `${stage} · ${percent}%` }
  }
  const status = toArchiveStatusLabel(row.archiveStatus)
  return {
    percent: 100,
    color,
    label: row.archiveStatus === 'COMPLETED' ? `${status} · 100%` : status,
  }
}

/** 已处理 / 总文件数，后端以字符串返回 */
function formatFileCounts(record: TileSetArchive): string {
  return `${record.processedFileCount} / ${record.totalFileCount}`
}

/** 列定义；序号按当前页换算，操作列依赖外部回调，因此每次渲染重建；列宽合计 1690 */
function buildColumns(
  current: number,
  pageSize: number,
  onDetail: (record: ArchiveRow) => void,
  onRetry: ((record: ArchiveRow) => void) | undefined,
  retryingNo: string | null | undefined,
): TableColumnsType<ArchiveRow> {
  return [
    {
      title: '序号',
      key: 'index',
      width: 70,
      render: (_, __, index) => (current - 1) * pageSize + index + 1,
    },
    { title: '归档编号', dataIndex: 'archiveNo', width: 240, ellipsis: true },
    {
      title: '归档名称',
      dataIndex: 'archiveName',
      width: 240,
      ellipsis: true,
    },
    { title: '任务名称', dataIndex: 'taskName', width: 200, ellipsis: true },
    {
      title: '处理类型',
      key: 'processingType',
      width: 110,
      render: (_, record) => toProcessingTypeLabel(record.processingType),
    },
    {
      // 状态与进度合成一列：条上方那行文字承担状态与阶段信息
      title: '进度',
      key: 'progress',
      width: 220,
      render: (_, record) => {
        const { percent, color, label } = progressDisplay(record)
        return (
          <span className={styles.progress}>
            <span className={styles.progressText}>{label}</span>
            <span className={styles.progressTrack}>
              <span
                className={styles.progressBar}
                style={{ width: `${percent}%`, background: color }}
              />
            </span>
          </span>
        )
      },
    },
    {
      title: '文件数',
      key: 'fileCounts',
      width: 130,
      render: (_, record) => formatFileCounts(record),
    },
    {
      title: '归档大小',
      key: 'archiveSizeBytes',
      width: 120,
      render: (_, record) => formatFileSize(record.archiveSizeBytes),
    },
    {
      title: '创建时间',
      key: 'createTime',
      width: 170,
      render: (_, record) => formatTime(record.createTime),
    },
    {
      title: '结束时间',
      key: 'finishTime',
      width: 170,
      render: (_, record) => formatTime(record.finishTime),
    },
    {
      title: '下载次数',
      key: 'downloadCount',
      width: 100,
      render: (_, record) => record.downloadCount,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      // 横向滚动时固定在表格右侧，按钮始终可见
      fixed: 'right',
      render: (_, record) => {
        const isRetrying = retryingNo === record.archiveNo
        return (
          <TableActions
            justify="evenly"
            actions={[
              {
                key: 'detail',
                label: '详情',
                onClick: () => onDetail(record),
              },
              {
                // 下载走 <a> 原生导航：整包流式落盘，不带鉴权头、也没有失败提示
                key: 'download',
                label: '下载',
                href: buildArchiveDownloadUrl(record.archiveNo),
                download: record.archiveName,
                disabled: !record.downloadAvailable,
              },
              {
                key: 'retry',
                label: isRetrying ? '重试中…' : '重试',
                onClick:
                  onRetry === undefined ? undefined : () => onRetry(record),
                // 只有失败类归档可以重试
                disabled:
                  onRetry === undefined ||
                  isRetrying ||
                  !canRetryArchive(record.archiveStatus),
              },
            ]}
          />
        )
      },
    },
  ]
}

/** 归档列表：分页查询静态瓦片集成果包，行内提供详情 / 下载 / 重试 */
export function ArchiveTable({
  records,
  isLoading,
  error,
  current,
  pageSize,
  total,
  onPageChange,
  onDetail,
  onRetry,
  retryingNo,
}: ArchiveTableProps) {
  return (
    <SearchTable<ArchiveRow>
      compact
      columns={buildColumns(current, pageSize, onDetail, onRetry, retryingNo)}
      dataSource={records}
      rowKey="id"
      loading={isLoading}
      total={total}
      current={current}
      pageSize={pageSize}
      onPageChange={onPageChange}
      scrollX={1690}
      emptyText={error ?? undefined}
    />
  )
}
