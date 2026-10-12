import { useEffect, useId, useRef } from 'react'
import type { UploadTaskItem } from '../../hooks/useUploadTasks'
import {
  UPLOAD_TASK_KINDS,
  toProcessingStageIndex,
  toProcessingStageLabel,
  toProcessingTypeOfKind,
} from '../../constants/task'
import styles from './UploadProgressDialog.module.css'

interface UploadProgressDialogProps {
  readonly tasks: readonly UploadTaskItem[]
  readonly onClearFinished: () => void
  readonly onClose: () => void
  /** 弹窗标题，默认「上传进度」 */
  readonly title?: string
  /** 没有任务时的提示文案，默认「暂无上传任务。」 */
  readonly emptyText?: string
  /** 帧里没有任务名时的兜底名称，默认「上传任务」 */
  readonly taskLabel?: string
}

/** 任务进度文案：状态 · 失败数 · 百分比 */
function formatTaskMeta(task: UploadTaskItem): string {
  return [
    task.statusText || '正在处理…',
    // task.totalCount !== null ? `${task.completedCount}/${task.totalCount}` : '',
    task.failedCount > 0 ? `失败 ${task.failedCount}` : '',
    task.percent !== null ? `${task.percent}%` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/**
 * 处理任务条上方的阶段行（如「分析中 2/4」）：颜色只区分成败，
 * 阶段推进靠这行文字表达。上传任务没有处理阶段，返回空串。
 */
function formatTaskStage(task: UploadTaskItem): string {
  // 上传类任务没有处理阶段，不显示阶段行
  if (UPLOAD_TASK_KINDS.some((kind) => kind === task.kind)) return ''
  const stage = toProcessingStageLabel(task.stageCode)
  if (stage === '') return ''
  const index = toProcessingStageIndex(
    toProcessingTypeOfKind(task.kind),
    task.stageCode,
  )
  return index === '' ? stage : `${stage} ${index}`
}

/** 任务进度中心：按任务编号展示每个任务的进度；上传进度与处理进度共用 */
export function UploadProgressDialog({
  tasks,
  onClearFinished,
  onClose,
  title = '上传进度',
  emptyText = '暂无上传任务。',
  taskLabel = '上传任务',
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
          {title}
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
          aria-label={`关闭${title}`}
        >
          ×
        </button>
      </div>
      {tasks.length === 0 ? (
        <p className={styles.empty}>{emptyText}</p>
      ) : (
        <ul className={styles.list}>
          {tasks.map((task) => {
            // 处理任务在条上方标出当前阶段，上传任务没有阶段行
            const stage = formatTaskStage(task)
            return (
              <li className={styles.task} key={task.taskNo}>
                <p className={styles.taskName}>{task.taskName || taskLabel}</p>
                <p className={styles.taskNo}>{task.taskNo}</p>
                {stage !== '' && <p className={styles.stage}>{stage}</p>}
                <div className={styles.track}>
                  {task.pending === true ? (
                    // 还没收到任何进度帧：用循环流动的条表示正在上传，而不是停在 0%
                    <div className={styles.barPending} aria-hidden="true" />
                  ) : (
                    <div
                      className={styles.bar}
                      style={{ width: `${task.percent ?? 0}%` }}
                    />
                  )}
                </div>
                <p className={styles.meta}>{formatTaskMeta(task)}</p>
              </li>
            )
          })}
        </ul>
      )}
    </dialog>
  )
}
