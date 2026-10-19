import { Suspense, lazy, useEffect, useState } from 'react'
import { AppDialog, formatTime } from '@ocean-cloud/ui'
import { DATASET_CATEGORY_LABELS } from '../../constants/dataset'
import { fetchDatasetFootprints } from '../../services/datasetService'
import type { DatasetFootprints, GeoDataset } from '../../types/dataset'
import styles from './DatasetDetailDialog.module.css'

/** 轮廓地图同样懒加载：ol 只在真的打开详情时才下载 */
const SpatialMap = lazy(() =>
  import('../SpatialMap/SpatialMap').then((module) => ({
    default: module.SpatialMap,
  })),
)

interface DatasetDetailDialogProps {
  readonly dataset: GeoDataset
  readonly onClose: () => void
}

/**
 * 数据集详情弹窗：只读展示数据集记录里的字段，外加一张文件覆盖范围地图。
 * 概览字段由列表带入；完整的轮廓面单独请求 /dataSet/{id}/footprints（simplifyTolerance 传 0）。
 */
export function DatasetDetailDialog({
  dataset,
  onClose,
}: DatasetDetailDialogProps) {
  const [footprints, setFootprints] = useState<DatasetFootprints | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchDatasetFootprints(dataset.id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setFootprints(result)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('文件覆盖范围加载失败。')
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [dataset.id])

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
  const hasFootprints = (footprints?.features ?? []).length > 0

  return (
    <AppDialog
      title="数据集详情"
      onClose={onClose}
      closeOutside
      className={styles.dialog}
    >
      <div className={styles.body}>
        {/* 覆盖范围地图放最上面：和文件详情的轮廓展示一致（红色半透明面 + 说明文案） */}
        <p className={styles.sectionTitle}>文件覆盖范围</p>
        <div className={styles.mapSlot}>
          {isLoading ? (
            <p className={styles.mapHint}>正在加载文件覆盖范围…</p>
          ) : error !== null ? (
            <p className={styles.mapHint}>{error}</p>
          ) : hasFootprints ? (
            <Suspense fallback={<p className={styles.mapHint}>地图加载中…</p>}>
              <SpatialMap geojson={footprints} />
            </Suspense>
          ) : (
            <p className={styles.mapHint}>该数据集暂无可用文件覆盖范围。</p>
          )}
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
      </div>
    </AppDialog>
  )
}
