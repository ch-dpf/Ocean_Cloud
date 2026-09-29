import { useEffect, useId, useRef } from 'react'
import { DATASET_CATEGORY_LABELS } from '../../constants/dataset'
import type { GeoDataset } from '../../types/dataset'
import styles from './DatasetDetailDialog.module.css'

interface DatasetDetailDialogProps {
  readonly dataset: GeoDataset
  readonly onClose: () => void
}

/** 后端返回形如 2026-09-11T20:55:43.623167，展示为 2026-09-11 20:55:43 */
function formatTime(value: string): string {
  if (!value) return '—'
  return value.replace('T', ' ').slice(0, 19)
}

/**
 * 数据集详情弹窗：只读展示数据集记录里的字段。
 * 记录由数据目录已加载的列表带入，不再单独请求详情接口。
 */
export function DatasetDetailDialog({
  dataset,
  onClose,
}: DatasetDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!dialogRef.current?.open) dialogRef.current?.showModal()
  }, [])

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
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={() => onClose()}
    >
      <div className={styles.heading}>
        <h2 className={styles.title} id={titleId}>
          数据集详情
        </h2>
        <button
          type="button"
          className={styles.close}
          onClick={() => onClose()}
          aria-label="关闭详情"
        >
          ×
        </button>
      </div>

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
    </dialog>
  )
}
