import { useMemo, useState } from 'react'
import { Alert, Button, Spin, Switch } from 'antd'
import { useVectorWorkspace } from '../../hooks/useVectorWorkspace'
import { useVectorStyles } from '../../hooks/useVectorStyles'
import { useVectorTiles } from '../../hooks/useVectorTiles'
import type { VectorLayer, VectorStyleDefinition } from '../../types/vector'
import { VectorFeaturePanel } from './VectorFeaturePanel'
import { VectorLayerList } from './VectorLayerList'
import { VectorMap } from './VectorMap'
import { VectorGeneralizationPanel } from '../VectorGeneralizationPanel/VectorGeneralizationPanel'
import { VectorStylePanel } from '../VectorStylePanel/VectorStylePanel'
import { VectorFeatureEditor } from '../VectorFeatureEditor/VectorFeatureEditor'
import { VectorClusterPanel } from '../VectorClusterPanel/VectorClusterPanel'
import { matchVectorStyle } from './vectorStyle'
import styles from './VectorCartography.module.css'

export function VectorCartography(props: { readonly dataSetId: string }) {
  const { dataSetId } = props
  const workspace = useVectorWorkspace(dataSetId)
  const styleState = useVectorStyles(workspace.layers)
  const [zoom, setZoom] = useState(4)
  const [editingLayer, setEditingLayer] = useState<VectorLayer | null>(null)
  const [preview, setPreview] = useState<VectorStyleDefinition | null>(null)
  const { draft, cluster, zoomTarget } = workspace
  const selected = workspace.selected?.feature ?? null
  const definitions = useMemo(() => {
    const result = Object.fromEntries(
      Object.keys(styleState.defaults).map((id) => [
        id,
        styleState.defaults[id].definition,
      ]),
    )
    if (editingLayer && preview) result[editingLayer.layerId] = preview
    return result
  }, [styleState.defaults, editingLayer, preview])
  const tiles = useVectorTiles(
    workspace.visibleLayers,
    definitions,
    workspace.refreshLayers,
    zoom,
  )
  const activeLayer = workspace.layers.find(
    (layer) => layer.layerId === workspace.activeLayerId,
  )
  const selectedLayer = workspace.layers.find(
    (layer) => layer.layerId === selected?.layerId,
  )
  const matches =
    selected && definitions[selected.layerId]
      ? matchVectorStyle(definitions[selected.layerId], selected, zoom)
      : []
  const refresh = () => {
    workspace.refreshLayers()
    tiles.refresh()
    tiles.clearError()
    workspace.setCluster(null)
  }
  const errors = [
    workspace.error,
    tiles.tileError,
    ...tiles.errors,
    ...styleState.errors,
  ].filter(Boolean)
  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <VectorLayerList
          layers={workspace.layers}
          visibleIds={workspace.visibleIds}
          activeLayerId={workspace.activeLayerId}
          loading={workspace.loadingLayers}
          layerKinds={workspace.layerKinds}
          onToggleVisible={workspace.toggleVisible}
          onActivate={workspace.setActiveLayerId}
          onRefresh={() => {
            refresh()
            styleState.refresh()
          }}
        />
        <div className={styles.panelTitle}>图层样式</div>
        <p className={styles.hint}>
          {activeLayer
            ? (styleState.defaults[activeLayer.layerId]?.name ?? '等待加载样式')
            : '请选择图层'}
        </p>
        <Button
          disabled={!activeLayer || !!editingLayer || !!draft}
          onClick={() => {
            if (activeLayer) setEditingLayer(activeLayer)
          }}
        >
          管理样式方案
        </Button>
        <VectorGeneralizationPanel
          key={activeLayer?.layerId}
          layer={activeLayer}
          disabled={!!draft}
          onChange={refresh}
        />
        <div className={styles.sectionTitle}>要素</div>
        {workspace.loadingFeature && <Spin size="small" />}
        {selected ? (
          <VectorFeaturePanel
            feature={selected}
            layerName={selectedLayer?.layerName ?? selected.layerId}
            editingStyle={!!editingLayer || !!draft}
            matches={matches}
            zoom={zoom}
            onEditStyle={() => {
              if (selectedLayer) setEditingLayer(selectedLayer)
            }}
            onEditFeature={() => workspace.setDraft(selected)}
          />
        ) : (
          <p className={styles.hint}>
            点击地图要素查看属性；聚合标记可展开成员。
          </p>
        )}
      </aside>
      <section className={styles.mapPanel}>
        <div className={styles.toolbar}>
          <span>显示 {Object.keys(tiles.contexts).length} 个图层</span>
          <Switch
            aria-label="点聚合"
            checked={tiles.aggregatePoints}
            onChange={(value) => {
              tiles.setAggregate(value)
              workspace.setCluster(null)
              tiles.clearError()
            }}
            checkedChildren="点聚合"
            unCheckedChildren="逐点显示"
          />
          {(tiles.pending > 0 || tiles.loading || styleState.loading) && (
            <Spin size="small" />
          )}
          {editingLayer && preview && <span>正在预览样式草稿</span>}
        </div>
        {tiles.overviewMessages.length > 0 && (
          <Alert
            type="info"
            showIcon
            message="概览状态"
            description={tiles.overviewMessages.join('；')}
          />
        )}
        {errors.length > 0 && (
          <Alert
            type="error"
            showIcon
            message={workspace.error ?? '部分图层显示失败'}
            description={errors.join('；')}
            action={
              <Button
                size="small"
                onClick={() => {
                  refresh()
                  if (styleState.errors.length) styleState.refresh()
                }}
              >
                重试
              </Button>
            }
          />
        )}
        <VectorMap
          layers={workspace.visibleLayers}
          contexts={tiles.contexts}
          definitions={definitions}
          selected={selected}
          draft={draft}
          focusGeometry={activeLayer?.extent ?? null}
          zoomTarget={zoomTarget}
          onSelect={workspace.handleSelect}
          onZoomChange={setZoom}
          onPendingChange={tiles.changePending}
          onTileError={tiles.handleTileError}
          onGeometryChange={workspace.changeGeometry}
        />
      </section>
      {editingLayer && (
        <VectorStylePanel
          key={editingLayer.layerId}
          layer={editingLayer}
          feature={selected}
          zoom={zoom}
          onPreview={setPreview}
          onPersist={styleState.refresh}
          onClose={() => {
            setEditingLayer(null)
            setPreview(null)
          }}
        />
      )}
      {draft && selected && (
        <VectorFeatureEditor
          key={draft.id}
          original={selected}
          draft={draft}
          busy={workspace.savingFeature}
          error={workspace.error}
          onChange={workspace.setDraft}
          onSave={workspace.saveFeature}
          onDelete={workspace.removeFeature}
          onClose={() => workspace.setDraft(null)}
        />
      )}
      {cluster && (
        <VectorClusterPanel
          key={cluster.contextId + cluster.clusterId}
          hit={cluster}
          onClose={() => workspace.setCluster(null)}
          onRefresh={refresh}
          onZoom={workspace.zoomCluster}
          onSelect={workspace.selectClusterMember}
        />
      )}
    </div>
  )
}
