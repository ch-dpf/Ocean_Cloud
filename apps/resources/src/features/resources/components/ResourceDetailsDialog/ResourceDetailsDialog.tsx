import { AppDialog } from '@ocean-cloud/ui'
import styles from './ResourceDetailsDialog.module.css'
import type { ResourceRecord } from '../../types/resource'
interface ResourceDetailsDialogProps {
  readonly resource: ResourceRecord | null
  readonly onClose: () => void
}
export function ResourceDetailsDialog({
  resource,
  onClose,
}: ResourceDetailsDialogProps) {
  if (resource === null) return null
  return (
    <AppDialog
      title={resource.name}
      onClose={onClose}
      closeOutside
      className={styles.dialog}
    >
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
    </AppDialog>
  )
}
