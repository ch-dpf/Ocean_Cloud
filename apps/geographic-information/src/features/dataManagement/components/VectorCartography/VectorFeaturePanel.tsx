import { Button, ColorPicker, InputNumber } from 'antd'
import type { VectorFeature } from '../../types/vector'
import { geometryKindLabels } from './geometryTypes'
import type { FeatureStyleSetting } from './vectorStyle'
import styles from './VectorCartography.module.css'

interface VectorFeaturePanelProps {
  readonly feature: VectorFeature
  readonly layerName: string
  readonly setting: FeatureStyleSetting
  readonly onChange: (setting: FeatureStyleSetting) => void
  readonly onReset: () => void
}

export function VectorFeaturePanel({
  feature,
  layerName,
  setting,
  onChange,
  onReset,
}: VectorFeaturePanelProps) {
  const labels = geometryKindLabels(feature.geometry)
  return (
    <div className={styles.featureDetail}>
      <div>ID：{feature.id}</div>
      <div>图层：{layerName}</div>
      <div>类型：{labels.length > 0 ? labels.join('、') : '未知'}</div>
      <div className={styles.styleField}>
        <span>颜色</span>
        <ColorPicker
          size="small"
          disabledAlpha
          value={setting.color}
          onChange={(value) =>
            onChange({ ...setting, color: value.toHexString() })
          }
        />
      </div>
      <div className={styles.styleField}>
        <span>起始显示层级</span>
        <InputNumber
          size="small"
          min={0}
          max={22}
          value={setting.minZoom}
          onChange={(value) => {
            if (typeof value !== 'number') return
            onChange({ ...setting, minZoom: value })
          }}
        />
      </div>
      <p className={styles.hint}>
        当前层级低于 {setting.minZoom} 时不显示该要素。
      </p>
      <Button size="small" onClick={onReset}>
        恢复默认样式
      </Button>
      <pre>{JSON.stringify(feature.properties ?? {}, null, 2)}</pre>
    </div>
  )
}
