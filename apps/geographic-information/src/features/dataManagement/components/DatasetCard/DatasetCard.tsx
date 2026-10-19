import { Suspense, lazy } from 'react'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { cellText, formatFileSize } from '@ocean-cloud/ui'
import { DATASET_CATEGORY_LABELS } from '../../constants/dataset'
import styles from './DatasetCard.module.css'
import type { GeoDataset } from '../../types/dataset'

/** 卡片「···」菜单：承接原数据集右键菜单的详情 / 重命名 / 删除 */
const CARD_MENU_ITEMS: MenuProps['items'] = [
  { key: 'detail', label: '详情' },
  { key: 'rename', label: '重命名' },
  { key: 'delete', label: '删除', danger: true },
]

/**
 * 覆盖范围地图：ol 体积不小，走单独的 chunk 懒加载，
 * 卡片一挂载就把该数据集的文件中心点画在图上（不做任何请求）
 */
const SpatialMap = lazy(() =>
  import('../SpatialMap/SpatialMap').then((module) => ({
    default: module.SpatialMap,
  })),
)

export interface DatasetCardProps {
  readonly dataset: GeoDataset
  /** 该分类是否支持发起处理；不支持时「处理」按钮置灰 */
  readonly canProcess: boolean
  readonly onViewData: (dataset: GeoDataset) => void
  readonly onProcess: (dataset: GeoDataset) => void
  /** 「···」菜单被点击，key 为 detail / rename / delete */
  readonly onMenuAction: (key: string, dataset: GeoDataset) => void
}

/**
 * 数据集卡片：上半部分是一张常驻地图，直接把分页接口带回的文件中心点画出来（完整的轮廓面在详情里）；
 * 下半是名称、描述、类型、文件数与总大小；底部是三个操作按钮与「···」菜单。
 * 正方形尺寸由网格项的 aspect-ratio 决定，卡片自身撑满，预览区吸收剩余高度。
 */
export function DatasetCard({
  dataset,
  canProcess,
  onViewData,
  onProcess,
  onMenuAction,
}: DatasetCardProps) {
  const categoryId = Number(dataset.categoryId)
  return (
    <article className={styles.card}>
      <div className={styles.preview}>
        <Suspense
          fallback={<span className={styles.previewLoading}>地图加载中…</span>}
        >
          <SpatialMap embedded points={dataset.filePoints ?? []} />
        </Suspense>
      </div>
      <div className={styles.info}>
        <h3 className={styles.name} title={dataset.dataSetName}>
          {dataset.dataSetName}
        </h3>
        <p className={styles.description} title={cellText(dataset.description)}>
          {cellText(dataset.description)}
        </p>
        <dl className={styles.meta}>
          <div className={styles.metaItem}>
            <dt>类型</dt>
            <dd>{DATASET_CATEGORY_LABELS[categoryId] ?? '—'}</dd>
          </div>
          <div className={styles.metaItem}>
            <dt>文件数</dt>
            <dd>{dataset.fileCount}</dd>
          </div>
          <div className={styles.metaItem}>
            {/* 总大小：分页接口返回的 totalSizeBytes，缺失时统一显示 — */}
            <dt>大小</dt>
            <dd title={formatFileSize(dataset.totalSizeBytes)}>
              {formatFileSize(dataset.totalSizeBytes)}
            </dd>
          </div>
        </dl>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          onClick={() => onViewData(dataset)}
        >
          查看数据
        </button>
        <button
          type="button"
          className={styles.action}
          disabled={!canProcess}
          title={canProcess ? undefined : '该分类暂不支持发起处理'}
          onClick={() => onProcess(dataset)}
        >
          处理
        </button>
        <button
          type="button"
          className={styles.action}
          disabled
          title="发布详情待接入"
        >
          发布详情
        </button>
        <Dropdown
          trigger={['click']}
          menu={{
            items: CARD_MENU_ITEMS,
            onClick: ({ key }) => onMenuAction(key, dataset),
          }}
        >
          <button type="button" className={styles.more} aria-label="更多操作">
            ···
          </button>
        </Dropdown>
      </div>
    </article>
  )
}
