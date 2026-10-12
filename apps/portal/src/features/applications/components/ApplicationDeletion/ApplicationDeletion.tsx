import { useEffect, useRef, useState } from 'react'
import type { MicroApplication } from '../../../../types/application'
import { deleteApplication } from '../../services/applicationService'
import { useApplications } from '../../hooks/useApplications'
import { AppDialog } from '@ocean-cloud/ui'
import styles from './ApplicationDeletion.module.css'
interface ApplicationDeletionProps {
  readonly application: MicroApplication
  readonly isDisabled: boolean
  readonly onDeleted: () => void
}
export function ApplicationDeletion({
  application,
  isDisabled,
  onDeleted,
}: ApplicationDeletionProps) {
  const cancel = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { refresh } = useApplications()
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    cancel.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])
  function close() {
    setIsOpen(false)
  }
  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    try {
      await deleteApplication(application.id)
      close()
      onDeleted()
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '删除失败，请重试。')
    } finally {
      setIsDeleting(false)
    }
  }
  return (
    <>
      <button
        className={styles.danger}
        disabled={isDisabled}
        title={isDisabled ? '请等待执行中的任务结束' : undefined}
        onClick={() => {
          setError(null)
          setIsOpen(true)
        }}
      >
        删除应用
      </button>
      {isOpen && (
        <AppDialog
          title={`删除“${application.name}”？`}
          // 删除中不允许关闭（禁用 × 并拦掉 Esc），避免状态错乱
          closable={!isDeleting}
          onClose={close}
          className={styles.dialog}
        >
          <p>应用将移入回收站，从应用中心移除，入口路由停止访问。</p>
          <div className={styles.note}>
            工程源码、发布版本和任务记录会保留，可在回收站恢复。删除期间应用标识和路由仍保留。
          </div>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <footer>
            <button ref={cancel} disabled={isDeleting} onClick={close}>
              取消
            </button>
            <button
              className={styles.confirm}
              disabled={isDeleting}
              onClick={() => void handleDelete()}
            >
              {isDeleting ? '正在删除…' : '确认删除'}
            </button>
          </footer>
        </AppDialog>
      )}
    </>
  )
}
