import { useState } from 'react'
import { Alert, Button, Spin } from 'antd'
import { ConfirmDialog } from '@ocean-cloud/ui'
import { useVectorWorkspace } from '../../hooks/useVectorWorkspace'
import { useVectorTiles } from '../../hooks/useVectorTiles'
import type { VectorLayer, VectorViewport } from '../../types/vector'
import { VectorFeaturePanel } from './VectorFeaturePanel'
import { VectorLayerList } from './VectorLayerList'
import { VectorMap } from './VectorMap'
import { VectorPresentationPanel } from '../VectorPresentationPanel/VectorPresentationPanel'
import { VectorFeatureEditor } from '../VectorFeatureEditor/VectorFeatureEditor'
import { VectorClusterPanel } from '../VectorClusterPanel/VectorClusterPanel'
import styles from './VectorCartography.module.css'

export function VectorCartography(props: { readonly dataSetId: string }) {
  const { dataSetId } = props
  const workspace = useVectorWorkspace(dataSetId)
  const [zoom, setZoom] = useState(4)
  const [viewport, setViewport] = useState<VectorViewport | null>(null)
  const [editingLayer, setEditingLayer] = useState<VectorLayer | null>(null)
  const [deletingLayer, setDeletingLayer] = useState<VectorLayer | null>(null)
  const { draft, cluster, zoomTarget } = workspace
  const selected = workspace.selected?.feature ?? null
  const tiles = useVectorTiles(
    dataSetId,
    viewport,
    workspace.visibleIds,
    workspace.refreshLayers,
  )
  const activeLayer = workspace.layers.find(
    (layer) => layer.layerId === workspace.activeLayerId,
  )
  const selectedLayer = workspace.layers.find(
    (layer) => layer.layerId === selected?.layerId,
  )
  const refresh = () => {
    workspace.refreshLayers()
    tiles.refresh()
    tiles.clearError()
    workspace.setCluster(null)
  }
  const errors = [workspace.error, tiles.tileError].filter(Boolean)
  /** 删除图层；要素与样式随图层一并移除，源文件不受影响。 */
  async function handleDeleteLayer(layer: VectorLayer) {
    await workspace.removeLayer(layer.layerId)
    if (editingLayer?.layerId === layer.layerId) {
      setEditingLayer(null)
    }
  }
  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <VectorLayerList
          layers={workspace.layers}
          groups={workspace.groups}
          visibleIds={workspace.visibleIds}
          activeLayerId={workspace.activeLayerId}
          loading={workspace.loadingLayers}
          layerKinds={workspace.layerKinds}
          onToggleVisible={workspace.toggleVisible}
          onToggleGroup={workspace.setGroupVisibility}
          onActivate={workspace.setActiveLayerId}
          onDelete={setDeletingLayer}
          onRefresh={() => {
            refresh()
          }}
        />
        <div className={styles.panelTitle}>图层样式</div>
        <p className={styles.hint}>
          {activeLayer
            ? activeLayer.styleMode === 'UNCONFIGURED'
              ? '尚未配置，当前图层不会显示'
              : activeLayer.styleMode === 'CUSTOM'
                ? '自定义样式'
                : '继承分类默认样式'
            : '请选择图层'}
        </p>
        <Button
          disabled={!activeLayer || !!editingLayer || !!draft}
          onClick={() => {
            if (activeLayer) setEditingLayer(activeLayer)
          }}
        >
          配置分类与样式
        </Button>
        <div className={styles.sectionTitle}>要素</div>
        {workspace.loadingFeature && <Spin size="small" />}
        {selected ? (
          <VectorFeaturePanel
            feature={selected}
            layerName={selectedLayer?.layerName ?? selected.layerId}
            editingStyle={!!editingLayer || !!draft}
            matches={[]}
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
          <span>
            {tiles.context
              ? tiles.context.forceAggregation
                ? `当前视窗已由服务端聚合 · 对象 ${tiles.context.objectCount}/${tiles.context.budget}（可放大或减少图层）`
                : `视窗对象 ${tiles.context.objectCount}/${tiles.context.budget}`
              : '等待创建视窗上下文'}
          </span>
          {workspace.datasetStyle && (
            <span>
              模板 v{workspace.datasetStyle.templateVersion} · 样式 v
              {workspace.datasetStyle.styleVersion}
            </span>
          )}
          {(tiles.pending > 0 || tiles.loading) && <Spin size="small" />}
        </div>
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
                }}
              >
                重试
              </Button>
            }
          />
        )}
        <VectorMap
          context={tiles.context}
          selected={selected}
          draft={draft}
          focusGeometry={activeLayer?.extent ?? null}
          zoomTarget={zoomTarget}
          onSelect={workspace.handleSelect}
          onZoomChange={setZoom}
          onViewportChange={setViewport}
          onPendingChange={tiles.changePending}
          onTileError={tiles.handleTileError}
          onGeometryChange={workspace.changeGeometry}
        />
      </section>
      {editingLayer && (
        <VectorPresentationPanel
          key={editingLayer.layerId}
          layer={editingLayer}
          groups={workspace.groups}
          onSaved={(updated) => {
            workspace.toggleVisible(
              updated.layerId,
              updated.enabled && updated.styleMode !== 'UNCONFIGURED',
            )
            refresh()
          }}
          onClose={() => setEditingLayer(null)}
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
      {deletingLayer && (
        <ConfirmDialog
          title="删除图层"
          message={`确定删除图层「${deletingLayer.layerName}」吗？该图层下的要素与样式会一并删除，源文件不受影响。`}
          confirmLabel="删除"
          danger
          onConfirm={() => handleDeleteLayer(deletingLayer)}
          onClose={() => setDeletingLayer(null)}
        />
      )}
    </div>
  )
}
