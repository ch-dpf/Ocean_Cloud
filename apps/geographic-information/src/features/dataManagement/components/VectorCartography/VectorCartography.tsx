import { useState } from 'react'
import { Alert, Button, Spin, Modal, Input } from 'antd'
import { ConfirmDialog } from '@ocean-cloud/ui'
import { useVectorWorkspace } from '../../hooks/useVectorWorkspace'
import { useVectorTiles } from '../../hooks/useVectorTiles'
import type {
  VectorLayer,
  VectorGroup,
  CartographyOverride,
} from '../../types/vector'
import { VectorFeaturePanel } from './VectorFeaturePanel'
import { VectorLayerList } from './VectorLayerList'
import { VectorMap } from './VectorMap'
import { VectorPresentationPanel } from '../VectorPresentationPanel/VectorPresentationPanel'
import { VectorFeatureEditor } from '../VectorFeatureEditor/VectorFeatureEditor'
import {
  saveGroupCartography,
  saveFeatureCartography,
  deleteFeatureCartography,
  getFeatureCartography,
} from '../../services/vectorService'
import styles from './VectorCartography.module.css'

export function VectorCartography(props: { readonly dataSetId: string }) {
  return (
    <VectorCartographyWorkspace
      key={props.dataSetId}
      dataSetId={props.dataSetId}
    />
  )
}

function VectorCartographyWorkspace(props: { readonly dataSetId: string }) {
  const { dataSetId } = props
  const workspace = useVectorWorkspace(dataSetId)
  const [zoom, setZoom] = useState(4)
  const [editingLayer, setEditingLayer] = useState<VectorLayer | null>(null)
  const [deletingLayer, setDeletingLayer] = useState<VectorLayer | null>(null)
  const [configTarget, setConfigTarget] = useState<{
    kind: 'group' | 'feature'
    id: string
    name: string
  } | null>(null)
  const [patchText, setPatchText] = useState('{"symbol":{}}')
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSaving, setConfigSaving] = useState(false)
  const { draft } = workspace
  const selected = workspace.selected?.feature ?? null
  const tiles = useVectorTiles(
    dataSetId,
    workspace.layerRevision,
    workspace.refreshLayers,
  )
  const selectedLayer = workspace.layers.find(
    (layer) => layer.layerId === selected?.layerId,
  )
  const refresh = () => {
    workspace.refreshLayers()
    tiles.refresh()
    tiles.clearError()
  }
  const errors = [workspace.error, tiles.tileError].filter(Boolean)
  const configureGroup = (group: VectorGroup) => {
    setPatchText(
      JSON.stringify(
        tiles.cartography?.groups[group.groupKey]?.override ?? { symbol: {} },
        null,
        2,
      ),
    )
    setConfigError(null)
    setConfigTarget({ kind: 'group', id: group.id, name: group.name })
  }
  const configureFeature = async () => {
    if (!selected) return
    setConfigError(null)
    try {
      const values = await getFeatureCartography(dataSetId, [selected.id])
      setPatchText(
        JSON.stringify(values[selected.id] ?? { symbol: {} }, null, 2),
      )
      setConfigTarget({ kind: 'feature', id: selected.id, name: selected.id })
    } catch (cause) {
      setConfigError(cause instanceof Error ? cause.message : '配图读取失败')
    }
  }
  const saveConfig = async () => {
    if (!configTarget) return
    setConfigSaving(true)
    try {
      const patch = JSON.parse(patchText) as CartographyOverride
      if (configTarget.kind === 'group')
        await saveGroupCartography(
          dataSetId,
          configTarget.id,
          patch,
          tiles.cartographyEtag,
        )
      else
        await saveFeatureCartography(
          dataSetId,
          configTarget.id,
          patch,
          tiles.cartographyEtag,
        )
      setConfigTarget(null)
      tiles.refresh()
    } catch (cause) {
      setConfigError(cause instanceof Error ? cause.message : '配图保存失败')
    } finally {
      setConfigSaving(false)
    }
  }
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
          groups={workspace.groups}
          hiddenGroups={workspace.hiddenGroups}
          loading={workspace.loadingLayers}
          onToggleGroup={workspace.setGroupVisibility}
          onConfigure={configureGroup}
          onRefresh={() => {
            refresh()
          }}
        />
        <div className={styles.sectionTitle}>要素</div>
        {workspace.loadingFeature && <Spin size="small" />}
        {selected ? (
          <VectorFeaturePanel
            feature={selected}
            layerName={selectedLayer?.layerName ?? selected.layerId}
            editingStyle={!!editingLayer || !!draft}
            matches={[]}
            zoom={zoom}
            onEditStyle={() => void configureFeature()}
            onEditFeature={() => workspace.setDraft(selected)}
          />
        ) : (
          <p className={styles.hint}>
            点击地图要素查看原始属性；显示几何保持点、线、面类型。
          </p>
        )}
        {selectedLayer && (
          <details>
            <summary>来源图层高级管理</summary>
            <p>{selectedLayer.layerName}</p>
            <Button
              disabled={!!draft}
              onClick={() => setEditingLayer(selectedLayer)}
            >
              挂载与图层样式
            </Button>
            <Button
              danger
              disabled={!!draft}
              onClick={() => setDeletingLayer(selectedLayer)}
            >
              删除图层
            </Button>
          </details>
        )}
        {configError && !configTarget && (
          <Alert type="error" message={configError} />
        )}
      </aside>
      <section className={styles.mapPanel}>
        <div className={styles.toolbar}>
          <span>
            {tiles.context
              ? `几何版本 ${tiles.context.tileVersion.slice(0, 8)} · 原生 Z0–${tiles.context.nativeMaxZoom}`
              : '加载地图定义'}
          </span>
          {workspace.datasetStyle && (
            <span>
              模板 v{workspace.datasetStyle.templateVersion} · 样式 v
              {tiles.cartography?.styleVersion ??
                workspace.datasetStyle.styleVersion}
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
          cartography={tiles.cartography}
          hiddenGroups={workspace.hiddenGroups}
          retryRevision={tiles.retryRevision}
          selected={selected}
          draft={draft}
          focusGeometry={tiles.context?.extent ?? null}
          minZoom={tiles.context?.minZoom ?? 0}
          maxZoom={tiles.context?.displayMaxZoom ?? 24}
          onSelect={workspace.handleSelect}
          onZoomChange={setZoom}
          onPendingChange={tiles.changePending}
          onTileError={tiles.handleTileError}
          onGeometryChange={workspace.changeGeometry}
        />
      </section>
      <Modal
        open={!!configTarget}
        title={
          configTarget
            ? `${configTarget.kind === 'group' ? '分组' : '要素'}配图 · ${configTarget.name}`
            : ''
        }
        onCancel={() => {
          if (!configSaving) setConfigTarget(null)
        }}
        onOk={() => void saveConfig()}
        confirmLoading={configSaving}
        okText="保存"
        cancelText="取消"
      >
        <p>
          仅保存覆盖字段，空 symbol 继承默认样式。面：fillColor / fillOpacity /
          strokeColor / strokeWidth；线：color / width / opacity；点：color /
          radius。visible 控制显隐。
        </p>
        <Input.TextArea
          rows={10}
          value={patchText}
          onChange={(event) => setPatchText(event.target.value)}
        />
        {configError && <Alert type="error" message={configError} />}
        {configTarget?.kind === 'feature' && (
          <Button
            disabled={configSaving}
            onClick={() => {
              setConfigSaving(true)
              void deleteFeatureCartography(
                dataSetId,
                configTarget.id,
                tiles.cartographyEtag,
              )
                .then(() => {
                  setConfigTarget(null)
                  tiles.refresh()
                })
                .catch((cause) =>
                  setConfigError(
                    cause instanceof Error ? cause.message : '恢复继承失败',
                  ),
                )
                .finally(() => setConfigSaving(false))
            }}
          >
            删除覆盖，恢复继承
          </Button>
        )}
      </Modal>
      {editingLayer && (
        <VectorPresentationPanel
          key={editingLayer.layerId}
          layer={editingLayer}
          groups={workspace.groups}
          onSaved={() => {
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
