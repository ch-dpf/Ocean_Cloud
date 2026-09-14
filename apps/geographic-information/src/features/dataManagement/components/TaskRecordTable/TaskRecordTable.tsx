import styles from './TaskRecordTable.module.css'
import { Pager } from '../Pager/Pager'
import { toTaskStatusLabel } from '../../constants/task'
import type { TaskRecord } from '../../types/task'

interface TaskRecordTableProps {
  readonly records: readonly TaskRecord[]
  readonly isLoading: boolean
  readonly error: string | null
  readonly current: number
  readonly lastPage: number
  readonly total: number
  readonly pageSize: number
  readonly onPageChange: (page: number) => void
}

/** 列定义；增删列只改这里，提示行的 colSpan 也跟着变 */
const COLUMNS = [
  '序号',
  '任务名称',
  '任务号',
  '状态',
  '进度',
  '失败数',
  '开始时间',
  '结束时间',
  '错误信息',
] as const

/** 后端返回形如 2026-09-14T17:04:57.043286，展示为 2026-09-14 17:04:57 */
function formatTime(value: string | null): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

export function TaskRecordTable({
  records,
  isLoading,
  error,
  current,
  lastPage,
  total,
  pageSize,
  onPageChange,
}: TaskRecordTableProps) {
  const hint =
    error ??
    (isLoading
      ? '正在加载导入记录…'
      : records.length === 0
        ? '暂无导入记录。'
        : null)
  // 不足一页时补空行，保证任何状态下表格同高、翻页位置固定
  const filledRows = hint !== null ? 1 : records.length
  const fillerCount = Math.max(0, pageSize - filledRows)
  return (
    <>
      <table className={styles.table}>
        <thead>
          <tr>
            {COLUMNS.map((title) => (
              <th key={title}>{title}</th>
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
                  <span className={styles.truncate} title={record.taskName}>
                    {record.taskName}
                  </span>
                </td>
                <td>
                  <span className={styles.truncate} title={record.taskNo}>
                    {record.taskNo}
                  </span>
                </td>
                <td>{toTaskStatusLabel(record.taskStatus)}</td>
                <td>
                  {record.completedCount} / {record.totalCount}
                </td>
                <td>{record.failedCount}</td>
                <td>{formatTime(record.startTime)}</td>
                <td>{formatTime(record.finishTime)}</td>
                <td>
                  {record.errorMessage ? (
                    <span
                      className={styles.errorText}
                      title={record.errorMessage}
                    >
                      {record.errorMessage}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))
          )}
          {Array.from({ length: fillerCount }, (_, index) => (
            <tr key={`filler-${index}`} aria-hidden="true">
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
