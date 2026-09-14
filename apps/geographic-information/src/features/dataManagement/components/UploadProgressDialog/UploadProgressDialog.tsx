import { useEffect, useId, useRef } from 'react'
import type { UploadTaskItem } from '../../hooks/useUploadTasks'
import styles from './UploadProgressDialog.module.css'

interface UploadProgressDialogProps {
  readonly tasks: readonly UploadTaskItem[]
  readonly onClearFinished: () => void
  readonly onClose: () => void
}

/** 任务进度文案：状态 · 已处理/总数 · 失败数 · 百分比 */
function formatTaskMeta(task: UploadTaskItem): string {
  return [
    task.statusText || '正在处理…',
    task.totalCount !== null ? `${task.completedCount}/${task.totalCount}` : '',
    task.failedCount > 0 ? `失败 ${task.failedCount}` : '',
    task.percent !== null ? `${task.percent}%` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/** 上传进度中心：按任务编号展示每个上传任务的进度 */
export function UploadProgressDialog({
  tasks,
  onClearFinished,
  onClose,
}: UploadProgressDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const hasFinished = tasks.some((task) => task.done)

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={() => onClose()}
    >
      <div className={styles.heading}>
        <h2 className={styles.title} id={titleId}>
          上传进度
        </h2>
        {hasFinished && (
          <button
            type="button"
            className={styles.clear}
            onClick={onClearFinished}
          >
            清空已完成
          </button>
        )}
        <button
          type="button"
          className={styles.close}
          onClick={onClose}
          aria-label="关闭上传进度"
        >
          ×
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className={styles.empty}>暂无上传任务。</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <li className={styles.task} key={task.taskNo}>
              <p className={styles.taskName}>{task.taskName || '上传任务'}</p>
              <p className={styles.taskNo}>{task.taskNo}</p>
              <div className={styles.track}>
                <div
                  className={styles.bar}
                  style={{ width: `${task.percent ?? 0}%` }}
                />
              </div>
              <p className={styles.meta}>{formatTaskMeta(task)}</p>
            </li>
          ))}
        </ul>
      )}
    </dialog>
  )
}
