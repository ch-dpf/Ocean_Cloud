import { AppDialog, formatTime } from '@ocean-cloud/ui'
import { DATASET_CATEGORY_LABELS } from '../../constants/dataset'
import type { GeoDataset } from '../../types/dataset'
import styles from './DatasetDetailDialog.module.css'

interface DatasetDetailDialogProps {
  readonly dataset: GeoDataset
  readonly onClose: () => void
}

/**
 * 数据集详情弹窗：只读展示数据集记录里的字段。
 * 记录由数据目录已加载的列表带入，不再单独请求详情接口。
 */
export function DatasetDetailDialog({
  dataset,
  onClose,
}: DatasetDetailDialogProps) {
  const fields = [
    { label: '数据集名称', value: dataset.dataSetName },
    { label: '数据集编码', value: dataset.dataSetCode || '—' },
    {
      label: '所属分类',
      value: DATASET_CATEGORY_LABELS[Number(dataset.categoryId)] ?? '未分类',
    },
    { label: '数据文件数', value: String(dataset.fileCount) },
    { label: '创建时间', value: formatTime(dataset.createTime) },
    { label: '更新时间', value: formatTime(dataset.updateTime) },
  ]

  return (
    <AppDialog
      title="数据集详情"
      onClose={onClose}
      closeOutside
      className={styles.dialog}
    >
      <div className={styles.body}>
        <dl className={styles.summary}>
          {fields.map((field) => (
            <div className={styles.summaryItem} key={field.label}>
              <dt>{field.label}</dt>
              <dd title={field.value}>{field.value}</dd>
            </div>
          ))}
        </dl>

        <p className={styles.sectionTitle}>数据集描述</p>
        <p className={styles.description}>{dataset.description || '—'}</p>
      </div>
    </AppDialog>
  )
}
