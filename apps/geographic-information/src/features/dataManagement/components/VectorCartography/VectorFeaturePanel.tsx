import { Button, Tag } from 'antd'
import type { VectorFeature, VectorRuleMatch } from '../../types/vector'
import { geometryKindLabels } from './geometryTypes'
import styles from './VectorCartography.module.css'

interface VectorFeaturePanelProps {
  readonly feature: VectorFeature
  readonly layerName: string
  readonly matches: readonly VectorRuleMatch[]
  readonly zoom: number
  readonly editingStyle: boolean
  readonly onEditFeature: () => void
  readonly onEditStyle: () => void
}
export function VectorFeaturePanel({
  feature,
  layerName,
  matches,
  zoom,
  onEditStyle,
  onEditFeature,
  editingStyle,
}: VectorFeaturePanelProps) {
  const labels = geometryKindLabels(feature.geometry)
  return (
    <div className={styles.featureDetail}>
      <div>ID：{feature.id}</div>
      <div>图层：{layerName}</div>
      <div>类型：{labels.length > 0 ? labels.join('、') : '未知'}</div>
      <div>当前层级 Z{zoom.toFixed(2)}</div>
      {matches.map((match) => (
        <div key={match.geometryPath} className={styles.matchRow}>
          <span title={match.geometryPath}>
            {match.geometryType} · {match.ruleId ?? '未匹配规则'}
          </span>
          <Tag color={match.visible ? 'green' : undefined}>
            {match.visible ? '显示' : '隐藏'}
          </Tag>
        </div>
      ))}
      <Button size="small" disabled={editingStyle} onClick={onEditStyle}>
        编辑所在图层样式
      </Button>
      <Button size="small" disabled={editingStyle} onClick={onEditFeature}>
        编辑原始要素
      </Button>
      <pre>{JSON.stringify(feature.properties ?? {}, null, 2)}</pre>
    </div>
  )
}
