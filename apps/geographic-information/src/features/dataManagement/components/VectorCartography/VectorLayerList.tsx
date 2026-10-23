import { Button, Checkbox, Empty, Spin } from 'antd'
import type { VectorGroup, VectorLayer } from '../../types/vector'
import {
  GEOMETRY_KIND_LABEL,
  GEOMETRY_KINDS,
  type GeometryKind,
} from './geometryTypes'
import styles from './VectorCartography.module.css'

interface VectorLayerListProps {
  readonly layers: readonly VectorLayer[]
  readonly groups: readonly VectorGroup[]
  readonly visibleIds: readonly string[]
  readonly activeLayerId: string | null
  readonly loading: boolean
  readonly layerKinds: Readonly<Record<string, readonly GeometryKind[]>>
  readonly onToggleVisible: (layerId: string, visible: boolean) => void
  readonly onToggleGroup: (groupId: string, visible: boolean) => void
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
  groups,
  visibleIds,
  activeLayerId,
  loading,
  layerKinds,
  onToggleVisible,
  onToggleGroup,
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
      {!loading && groups.length > 0 && (
        <div className={styles.layerList} aria-label="矢量分类树">
          {groups.map((group) => (
            <GroupNode
              key={group.id}
              group={group}
              depth={0}
              layers={layers}
              visibleIds={visibleIds}
              activeLayerId={activeLayerId}
              layerKinds={layerKinds}
              onToggle={onToggleGroup}
              onToggleVisible={onToggleVisible}
              onActivate={onActivate}
              onDelete={onDelete}
            />
          ))}
          {layers
            .filter((layer) => !layer.groupId)
            .map((layer) => (
              <LayerItem
                key={layer.layerId}
                layer={layer}
                depth={1}
                visibleIds={visibleIds}
                activeLayerId={activeLayerId}
                kinds={layerKinds[layer.layerId] ?? []}
                onToggleVisible={onToggleVisible}
                onActivate={onActivate}
                onDelete={onDelete}
              />
            ))}
        </div>
      )}
      {!loading && layers.length === 0 && (
        <Empty description="暂无图层，先导入 GeoJSON 文件" />
      )}
    </>
  )
}

function GroupNode(props: {
  readonly group: VectorGroup
  readonly depth: number
  readonly layers: readonly VectorLayer[]
  readonly visibleIds: readonly string[]
  readonly activeLayerId: string | null
  readonly layerKinds: Readonly<Record<string, readonly GeometryKind[]>>
  readonly onToggle: (groupId: string, enabled: boolean) => void
  readonly onToggleVisible: (layerId: string, visible: boolean) => void
  readonly onActivate: (layerId: string) => void
  readonly onDelete: (layer: VectorLayer) => void
}) {
  const {
    group,
    depth,
    layers,
    visibleIds,
    activeLayerId,
    layerKinds,
    onToggle,
    onToggleVisible,
    onActivate,
    onDelete,
  } = props
  return (
    <div>
      <div className={styles.layerRow} style={{ paddingLeft: depth * 14 }}>
        <Checkbox
          checked={group.enabled}
          onChange={(event) => onToggle(group.id, event.target.checked)}
        />
        <span className={styles.layerName} title={group.groupKey}>
          {group.name}（{group.layerCount}）
        </span>
      </div>
      {layers
        .filter((layer) => layer.groupId === group.id)
        .map((layer) => (
          <LayerItem
            key={layer.layerId}
            layer={layer}
            depth={depth + 1}
            visibleIds={visibleIds}
            activeLayerId={activeLayerId}
            kinds={layerKinds[layer.layerId] ?? []}
            onToggleVisible={onToggleVisible}
            onActivate={onActivate}
            onDelete={onDelete}
          />
        ))}
      {group.children.map((child) => (
        <GroupNode
          key={child.id}
          group={child}
          depth={depth + 1}
          layers={layers}
          visibleIds={visibleIds}
          activeLayerId={activeLayerId}
          layerKinds={layerKinds}
          onToggle={onToggle}
          onToggleVisible={onToggleVisible}
          onActivate={onActivate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function LayerItem(props: {
  readonly layer: VectorLayer
  readonly depth: number
  readonly visibleIds: readonly string[]
  readonly activeLayerId: string | null
  readonly kinds: readonly GeometryKind[]
  readonly onToggleVisible: (layerId: string, visible: boolean) => void
  readonly onActivate: (layerId: string) => void
  readonly onDelete: (layer: VectorLayer) => void
}) {
  const {
    layer,
    depth,
    visibleIds,
    activeLayerId,
    kinds,
    onToggleVisible,
    onActivate,
    onDelete,
  } = props
  return (
    <div className={styles.layerItem} style={{ marginLeft: depth * 14 }}>
      <div className={styles.layerRow}>
        <Checkbox
          checked={visibleIds.includes(layer.layerId)}
          disabled={
            layer.status !== 'READY' ||
            !layer.enabled ||
            layer.styleMode === 'UNCONFIGURED'
          }
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
            ? `${layer.featureCount} 个要素 · ${
                layer.styleMode === 'UNCONFIGURED'
                  ? '待配置'
                  : layer.enabled
                    ? '已启用'
                    : '已停用'
              }`
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
}
