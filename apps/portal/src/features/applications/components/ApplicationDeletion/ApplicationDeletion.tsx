import { useEffect, useRef, useState } from 'react'
import type { MicroApplication } from '../../../../types/application'
import { deleteApplication } from '../../services/applicationService'
import { useApplications } from '../../hooks/useApplications'
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
  const dialog = useRef<HTMLDialogElement>(null)
  const cancel = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { refresh } = useApplications()
  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    cancel.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])
  function close() {
    dialog.current?.close()
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
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby="application-delete-title"
          onCancel={(event) => {
            event.preventDefault()
            if (!isDeleting) close()
          }}
        >
          <h2 id="application-delete-title">删除“{application.name}”？</h2>
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
        </dialog>
      )}
    </>
  )
}
