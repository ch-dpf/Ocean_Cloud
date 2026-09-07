import styles from './ResourceDetailsDialog.module.css'
import { useEffect, useId, useRef } from 'react'
import type { ResourceRecord } from '../../types/resource'
interface ResourceDetailsDialogProps {
  readonly resource: ResourceRecord | null
  readonly onClose: () => void
}
export function ResourceDetailsDialog({
  resource,
  onClose,
}: ResourceDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (resource && !dialogRef.current?.open) dialogRef.current?.showModal()
    else if (!resource) dialogRef.current?.close()
  }, [resource])
  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={() => onClose()}
    >
      {resource && (
        <>
          <div className={styles.detailHeading}>
            <h2 id={titleId}>{resource.name}</h2>
            <button aria-label="关闭详情" onClick={() => onClose()}>
              ×
            </button>
          </div>
          <p>{resource.description}</p>
          <dl>
            <dt>资源编号</dt>
            <dd>{resource.id}</dd>
            <dt>数据格式</dt>
            <dd>{resource.format}</dd>
            <dt>数据大小</dt>
            <dd>{resource.sizeLabel}</dd>
          </dl>
          <p className={styles.hint}>此条目为元数据示例，暂不提供文件下载。</p>
        </>
      )}
    </dialog>
  )
}
