import { Button, Checkbox, Empty, Spin } from 'antd'
import type { VectorLayer } from '../../types/vector'
import {
  GEOMETRY_KIND_LABEL,
  GEOMETRY_KINDS,
  type GeometryKind,
} from './geometryTypes'
import styles from './VectorCartography.module.css'

interface VectorLayerListProps {
  readonly layers: readonly VectorLayer[]
  readonly visibleIds: readonly string[]
  readonly activeLayerId: string | null
  readonly loading: boolean
  readonly layerKinds: Readonly<Record<string, readonly GeometryKind[]>>
  readonly onToggleVisible: (layerId: string, visible: boolean) => void
  readonly onActivate: (layerId: string) => void
  readonly onDelete: (layer: VectorLayer) => void
  readonly onRefresh: () => void
}

const KIND_CLASS: Record<GeometryKind, string> = {
  point: styles.typePoint,
  line: styles.typeLine,
  polygon: styles.typePolygon,
}

export function VectorLayerList({
  layers,
  visibleIds,
  activeLayerId,
  loading,
  layerKinds,
  onToggleVisible,
  onActivate,
  onDelete,
  onRefresh,
}: VectorLayerListProps) {
  return (
    <>
      <div className={styles.panelTitle}>
        <span>图层</span>
        <Button size="small" onClick={onRefresh}>
          刷新
        </Button>
      </div>
      {loading && <Spin size="small" />}
      {!loading && layers.length === 0 && (
        <Empty description="暂无图层，先导入 GeoJSON 文件" />
      )}
      <div className={styles.layerList}>
        {layers.map((layer) => {
          const kinds = layerKinds[layer.layerId] ?? []
          return (
            <div className={styles.layerItem} key={layer.layerId}>
              <div className={styles.layerRow}>
                <Checkbox
                  checked={visibleIds.includes(layer.layerId)}
                  disabled={layer.status !== 'READY'}
                  onChange={(event) =>
                    onToggleVisible(layer.layerId, event.target.checked)
                  }
                />
                <button
                  type="button"
                  className={
                    layer.layerId === activeLayerId
                      ? styles.activeLayer
                      : styles.layerName
                  }
                  title={layer.layerName}
                  disabled={layer.status !== 'READY'}
                  onClick={() => onActivate(layer.layerId)}
                >
                  {layer.layerName}
                </button>
              </div>
              <div className={styles.layerMeta}>
                <span>
                  {layer.status === 'READY'
                    ? `${layer.featureCount} 个要素`
                    : layer.status}
                </span>
                {kinds.length > 0 && (
                  <span className={styles.typeTags}>
                    {GEOMETRY_KINDS.filter((kind) => kinds.includes(kind)).map(
                      (kind) => (
                        <span key={kind} className={KIND_CLASS[kind]}>
                          {GEOMETRY_KIND_LABEL[kind]}
                        </span>
                      ),
                    )}
                  </span>
                )}
                <button
                  type="button"
                  className={styles.layerDelete}
                  aria-label={`删除图层 ${layer.layerName}`}
                  onClick={() => onDelete(layer)}
                >
                  删除
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
