import { Alert, Button, Tag } from 'antd'
import type {
  VectorFeature,
  VectorStyleMatch as StyleMatch,
} from '../../types/vector'
import styles from '../VectorCartography/VectorCartography.module.css'

interface VectorStyleMatchProps {
  readonly feature: VectorFeature | null
  readonly zoom: number
  readonly result: StyleMatch | null
  readonly styleVersion: string | number | undefined
  readonly busy: boolean
  readonly dirty: boolean
  readonly canVerify: boolean
  readonly onVerify: (featureId: string, zoom: number) => Promise<void>
}
export function VectorStyleMatch({
  feature,
  zoom,
  result,
  styleVersion,
  busy,
  dirty,
  canVerify,
  onVerify,
}: VectorStyleMatchProps) {
  const current =
    result &&
    feature?.id === result.featureId &&
    String(feature.version) === String(result.featureVersion) &&
    zoom === result.zoom &&
    !dirty
      ? result
      : null
  return (
    <>
      <div className={styles.panelTitle}>检查所选要素</div>
      <p className={styles.hint}>
        {feature
          ? '要素 ' + feature.id + ' · 层级 Z' + zoom.toFixed(2)
          : '先在地图中选中当前图层的一个要素。'}
      </p>
      <Button
        disabled={busy || !canVerify || dirty || !feature}
        onClick={() => {
          if (feature) void onVerify(feature.id, zoom)
        }}
      >
        检查已保存方案的匹配结果
      </Button>
      {dirty && <p className={styles.hint}>请先保存草稿，再检查已保存方案。</p>}
      {current && (
        <>
          {String(current.styleVersion) !== String(styleVersion) && (
            <Alert
              type="warning"
              message="服务端方案版本已变化，请重新加载后查看。"
            />
          )}
          {current.matches.map((match) => (
            <div key={match.geometryPath} className={styles.matchRow}>
              <span>
                {match.geometryPath} · {match.ruleId ?? '未匹配规则'}
              </span>
              <Tag color={match.visible ? 'green' : undefined}>
                {match.visible ? '显示' : '隐藏'}
              </Tag>
            </div>
          ))}
        </>
      )}
    </>
  )
}
