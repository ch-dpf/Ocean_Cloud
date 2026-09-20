import { useEffect, useId, useRef, useState } from 'react'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  readonly title: string
  readonly message: string
  /** 确认按钮文案，默认「确定」 */
  readonly confirmLabel?: string
  /** 危险操作：确认按钮用警示色 */
  readonly danger?: boolean
  /** 确认后的动作；抛错表示失败，弹窗保留便于重试 */
  readonly onConfirm: () => Promise<void>
  readonly onClose: () => void
}

/** 通用确认弹窗：替代 window.confirm，确认期间禁用按钮并显示处理中 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = '确定',
  danger = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

  async function handleConfirm() {
    setIsPending(true)
    try {
      await onConfirm()
    } catch {
      // 失败提示由 RequestErrorNotice 统一展示，保留弹窗便于重试
      setIsPending(false)
      return
    }
    setIsPending(false)
    onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={() => onClose()}
    >
      <div className={styles.body}>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => onClose()}
            disabled={isPending}
          >
            取消
          </button>
          <button
            type="button"
            className={danger ? styles.danger : styles.confirm}
            onClick={() => void handleConfirm()}
            disabled={isPending}
          >
            {isPending ? '处理中…' : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}
