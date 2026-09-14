import styles from './FileMetaTable.module.css'
import { Pager } from '../Pager/Pager'
import {
  DATASET_CATEGORY_LABELS,
  toProcessLabel,
} from '../../constants/dataset'
import type { FileMeta } from '../../types/fileMeta'

interface FileMetaTableProps {
  readonly records: readonly FileMeta[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly lastPage: number
  /** 总条数，展示在翻页左侧 */
  readonly total: number
  /** 每页条数，用于计算跨页连续的序号 */
  readonly pageSize: number
  readonly onPageChange: (page: number) => void
  readonly onDelete: (record: FileMeta) => void
  /** 正在删除的记录 id，用于禁用对应的按钮 */
  readonly deletingId: string | null
}

/** 列定义；增删列只改这里，提示行的 colSpan 也跟着变 */
const COLUMNS = [
  '序号',
  '文件名',
  '文件路径',
  '上传时间',
  // '采集时间',
  '数据规模',
  '数据类型',
  '数据格式',
  '处理类型',
  '操作',
] as const

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

export function FileMetaTable({
  records,
  isLoading,
  error,
  total,
  current,
  lastPage,
  pageSize,
  onPageChange,
  onDelete,
  deletingId,
}: FileMetaTableProps) {
  const hint = error ? (
    <span role="alert">{error}</span>
  ) : isLoading ? (
    <span role="status">正在加载数据…</span>
  ) : records.length === 0 ? (
    <span>暂无数据。</span>
  ) : null
  // 不足一页时补空行，保证翻页条位置固定（永远在一页高度的右下角）
  const filledRows = hint !== null ? 1 : records.length
  const fillerCount = Math.max(0, pageSize - filledRows)
  return (
    <>
      <table className={styles.table}>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hint !== null ? (
            <tr>
              <td className={styles.hintCell} colSpan={COLUMNS.length}>
                {hint}
              </td>
            </tr>
          ) : (
            records.map((record, index) => (
              <tr key={record.id}>
                <td>{(current - 1) * pageSize + index + 1}</td>
                <td>
                  <span className={styles.truncate} title={record.originalName}>
                    {record.originalName}
                  </span>
                </td>
                <td>
                  <span className={styles.truncate} title={record.storageKey}>
                    {record.storageKey}
                  </span>
                </td>
                <td>{formatTime(record.createTime)}</td>
                <td>{formatFileSize(record.sizeBytes)}</td>
                <td>{DATASET_CATEGORY_LABELS[Number(record.categoryId)]}</td>
                <td>{record.extension}</td>
                <td>{toProcessLabel(Number(record.categoryId))}</td>
                <td>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => onDelete(record)}
                    disabled={deletingId === record.id}
                  >
                    {deletingId === record.id ? '删除中…' : '删除'}
                  </button>
                </td>
              </tr>
            ))
          )}
          {Array.from({ length: fillerCount }, (_, index) => (
            <tr key={`filler-${index}`}>
              <td colSpan={COLUMNS.length}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.footer}>
        <span className={styles.total}>共 {total} 条</span>
        <Pager current={current} lastPage={lastPage} onChange={onPageChange} />
      </div>
    </>
  )
}
