import { useCallback, useEffect, useMemo, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import { Alert, Button, Checkbox, Empty, Input, Modal, Popconfirm, Select, Spin, Tag, message } from 'antd'
import {
  createVectorFeature,
  deleteVectorFeature,
  deleteVectorLayer,
  getVectorFeature,
  getVectorFeatures,
  getVectorLayer,
  getVectorLayers,
  updateVectorFeature,
} from '../../services/vectorService'
import type { VectorFeature, VectorFeatureDraft, VectorLayer } from '../../types/vector'
import { VectorMap } from './VectorMap'
import type { DrawGeometry, VectorBbox } from './VectorMap'
import styles from './VectorCartography.module.css'

interface VectorCartographyProps {
  readonly dataSetId: string
}

interface FeatureEditor {
  readonly layerId: string
  readonly original: VectorFeature | null
  readonly geometry: string
  readonly properties: string
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  return '请求失败，请稍后重试'
}

function toEditor(layerId: string, feature: VectorFeature | VectorFeatureDraft): FeatureEditor {
  return {
    layerId,
    original: 'id' in feature ? feature : null,
    geometry: JSON.stringify(feature.geometry, null, 2),
    properties: JSON.stringify(feature.properties ?? {}, null, 2),
  }
}

async function loadAllLayers(dataSetId: string, signal: AbortSignal): Promise<VectorLayer[]> {
  const all: VectorLayer[] = []
  for (let pageNo = 1; ; pageNo += 1) {
    const page = await getVectorLayers(dataSetId, pageNo, 100, signal)
    all.push(...page.records)
    if (page.records.length === 0 || all.length >= Number(page.total)) return all
  }
}

/** 矢量数据集专属工作区：图层、视窗查询和要素编辑均以当前后端接口为准。 */
export function VectorCartography({ dataSetId }: VectorCartographyProps) {
  const [layers, setLayers] = useState<readonly VectorLayer[]>([])
  const [visibleIds, setVisibleIds] = useState<readonly string[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [features, setFeatures] = useState<readonly VectorFeature[]>([])
  const [bbox, setBbox] = useState<VectorBbox | null>(null)
  const [selected, setSelected] = useState<VectorFeature | null>(null)
  const [drawGeometry, setDrawGeometry] = useState<DrawGeometry>(null)
  const [editor, setEditor] = useState<FeatureEditor | null>(null)
  const [loadingLayers, setLoadingLayers] = useState(false)
  const [loadingFeatures, setLoadingFeatures] = useState(false)
  const [saving, setSaving] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const [layerRevision, setLayerRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      setLoadingLayers(true)
      try {
        const records = await loadAllLayers(dataSetId, controller.signal)
        if (controller.signal.aborted) return
        setLayers(records)
        setVisibleIds((previous) => {
          const valid = previous.filter((id) => records.some((item) => item.layerId === id && item.status === 'READY'))
          return previous.length === 0
            ? records.filter((item) => item.status === 'READY').map((item) => item.layerId)
            : valid
        })
        setActiveLayerId((previous) =>
          records.some((item) => item.layerId === previous && item.status === 'READY')
            ? previous
            : records.find((item) => item.status === 'READY')?.layerId ?? null,
        )
        setError(null)
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorText(cause))
      } finally {
        if (!controller.signal.aborted) setLoadingLayers(false)
      }
    })()
    return () => controller.abort()
  }, [dataSetId, layerRevision])

  const visibleReady = useMemo(
    () => layers.filter((item) => item.status === 'READY' && visibleIds.includes(item.layerId)),
    [layers, visibleIds],
  )
  const visibleKey = visibleReady.map((item) => `${item.layerId}:${item.dataVersion}`).join(',')

  useEffect(() => {
    if (!bbox || visibleReady.length === 0) {
      setFeatures([])
      setTruncated(false)
      return
    }
    const controller = new AbortController()
    void (async () => {
      setLoadingFeatures(true)
      try {
        let loaded: VectorFeature[] = []
        let limited = false
        // 游标在并发编辑后可能过期（409）；从第一页重查一次即可。
        for (let attempt = 0; attempt < 2; attempt += 1) {
          loaded = []
          limited = false
          try {
            for (const [index, layer] of visibleReady.entries()) {
              let cursor: string | undefined
              for (;;) {
                const page = await getVectorFeatures(layer.layerId, bbox, cursor, controller.signal)
                loaded.push(...page.features)
                if (loaded.length >= 2000) {
                  limited = page.hasMore || index < visibleReady.length - 1 || loaded.length > 2000
                  break
                }
                if (!page.hasMore || !page.nextCursor) break
                cursor = page.nextCursor
              }
              if (loaded.length >= 2000) break
            }
            break
          } catch (cause) {
            if (!(cause instanceof RequestError) || cause.status !== 409 || attempt === 1)
              throw cause
          }
        }
        if (controller.signal.aborted) return
        setFeatures(loaded.slice(0, 2000))
        setTruncated(limited)
        setError(null)
      } catch (cause) {
        if (!controller.signal.aborted) {
          setFeatures([])
          setError(errorText(cause))
        }
      } finally {
        if (!controller.signal.aborted) setLoadingFeatures(false)
      }
    })()
    return () => controller.abort()
  // visibleKey represents the layer/version set. The array itself is derived from the same state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bbox, visibleKey, revision])

  const activeLayer = layers.find((item) => item.layerId === activeLayerId) ?? null
  const focusGeometry = activeLayer?.extent ?? null
  const handleBbox = useCallback((next: VectorBbox) => setBbox(next), [])
  const handleSelect = useCallback((feature: VectorFeature | null) => setSelected(feature), [])
  const handleDraw = useCallback((draft: VectorFeatureDraft) => {
    if (!activeLayerId) return
    setDrawGeometry(null)
    setEditor(toEditor(activeLayerId, draft))
  }, [activeLayerId])

  async function openEdit() {
    if (!selected) return
    try {
      const latest = await getVectorFeature(selected.layerId, selected.id)
      setSelected(latest)
      setEditor(toEditor(latest.layerId, latest))
    } catch (cause) {
      message.error(errorText(cause))
    }
  }

  async function saveFeature() {
    if (!editor) return
    let draft: VectorFeatureDraft
    try {
      const geometry = JSON.parse(editor.geometry) as VectorFeatureDraft['geometry']
      const properties = JSON.parse(editor.properties) as unknown
      if (!geometry || typeof geometry.type !== 'string' ||
          !properties || typeof properties !== 'object' || Array.isArray(properties))
        throw new Error('几何须为 GeoJSON 对象，属性须为 JSON 对象')
      draft = { type: 'Feature', geometry, properties: properties as Record<string, unknown> }
    } catch (cause) {
      message.error(`JSON 格式无效：${errorText(cause)}`)
      return
    }
    setSaving(true)
    try {
      const saved = editor.original
        ? await updateVectorFeature(editor.layerId, editor.original.id, editor.original.version, draft)
        : await createVectorFeature(editor.layerId, draft)
      setSelected(saved)
      setEditor(null)
      setRevision((value) => value + 1)
      setLayerRevision((value) => value + 1)
      message.success(editor.original ? '要素已更新' : '要素已创建')
    } catch (cause) {
      message.error(`${errorText(cause)}；如发生版本冲突，请重新选中要素后编辑`)
    } finally {
      setSaving(false)
    }
  }

  async function removeFeature() {
    if (!selected) return
    try {
      const latest = await getVectorFeature(selected.layerId, selected.id)
      await deleteVectorFeature(latest.layerId, latest.id, latest.version)
      setSelected(null)
      setRevision((value) => value + 1)
      setLayerRevision((value) => value + 1)
      message.success('要素已删除')
    } catch (cause) {
      message.error(errorText(cause))
    }
  }

  async function removeLayer(layer: VectorLayer) {
    try {
      const latest = await getVectorLayer(layer.layerId)
      await deleteVectorLayer(latest.layerId, latest.dataVersion)
      setSelected(null)
      setLayerRevision((value) => value + 1)
      message.success('图层已删除；源文件未更改')
    } catch (cause) {
      message.error(errorText(cause))
    }
  }

  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <div className={styles.panelTitle}>
          <span>图层</span>
          <Button size="small" onClick={() => setLayerRevision((value) => value + 1)}>
            刷新
          </Button>
        </div>
        {loadingLayers && <Spin size="small" />}
        {!loadingLayers && layers.length === 0 && <Empty description="暂无图层，先导入 GeoJSON 文件" />}
        <div className={styles.layerList}>
          {layers.map((layer) => (
            <div className={styles.layerRow} key={layer.layerId}>
              <Checkbox
                checked={visibleIds.includes(layer.layerId)}
                disabled={layer.status !== 'READY'}
                onChange={(event) => setVisibleIds((previous) =>
                  event.target.checked
                    ? [...previous, layer.layerId]
                    : previous.filter((id) => id !== layer.layerId))}
              />
              <button
                type="button"
                className={layer.layerId === activeLayerId ? styles.activeLayer : styles.layerName}
                disabled={layer.status !== 'READY'}
                onClick={() => setActiveLayerId(layer.layerId)}
              >
                {layer.layerName}
              </button>
              <Tag>{layer.status === 'READY' ? `${layer.featureCount} 个要素` : layer.status}</Tag>
              <Popconfirm title="删除此图层？源文件不会删除。" onConfirm={() => void removeLayer(layer)}>
                <Button type="text" size="small" danger aria-label={`删除图层 ${layer.layerName}`}>删除</Button>
              </Popconfirm>
            </div>
          ))}
        </div>
        <div className={styles.panelTitle}>要素</div>
        {selected ? (
          <div className={styles.featureDetail}>
            <div>ID：{selected.id}</div>
            <div>图层：{layers.find((item) => item.layerId === selected.layerId)?.layerName ?? selected.layerId}</div>
            <div>几何：{selected.geometry.type}</div>
            <pre>{JSON.stringify(selected.properties ?? {}, null, 2)}</pre>
            <Button size="small" onClick={() => void openEdit()}>编辑要素</Button>
            <Popconfirm title="删除所选要素？" onConfirm={() => void removeFeature()}>
              <Button size="small" danger>删除要素</Button>
            </Popconfirm>
          </div>
        ) : (
          <p className={styles.hint}>点击地图中的要素查看属性；选择图层后可在地图上绘制新要素。</p>
        )}
      </aside>
      <section className={styles.mapPanel}>
        <div className={styles.toolbar}>
          <span>当前编辑图层</span>
          <Select
            className={styles.layerSelect}
            value={activeLayerId}
            placeholder="选择图层"
            options={layers.filter((item) => item.status === 'READY').map((item) => ({
              label: item.layerName, value: item.layerId,
            }))}
            onChange={setActiveLayerId}
          />
          <Select<DrawGeometry>
            className={styles.drawSelect}
            value={drawGeometry}
            options={[
              { label: '浏览/选择', value: null },
              { label: '绘制点', value: 'Point' },
              { label: '绘制线', value: 'LineString' },
              { label: '绘制面', value: 'Polygon' },
            ]}
            disabled={!activeLayerId}
            onChange={setDrawGeometry}
          />
          {loadingFeatures && <Spin size="small" />}
        </div>
        {error && <Alert type="error" showIcon message={error} closable onClose={() => setError(null)} />}
        {truncated && <Alert type="warning" showIcon message="当前视窗要素超过 2000 个，仅显示前 2000 个；请放大地图缩小查询范围。" />}
        <VectorMap
          features={features}
          focusGeometry={focusGeometry}
          selectedFeatureId={selected?.id ?? null}
          drawGeometry={drawGeometry}
          onBboxChange={handleBbox}
          onSelect={handleSelect}
          onDraw={handleDraw}
        />
      </section>
      <Modal
        title={editor?.original ? '编辑要素' : '新增要素'}
        open={editor !== null}
        confirmLoading={saving}
        onOk={() => void saveFeature()}
        onCancel={() => setEditor(null)}
        okText="保存"
      >
        <label className={styles.fieldLabel} htmlFor="vector-geometry">GeoJSON 几何</label>
        <Input.TextArea
          id="vector-geometry"
          rows={7}
          value={editor?.geometry ?? ''}
          onChange={(event) => setEditor((previous) => previous && { ...previous, geometry: event.target.value })}
        />
        <label className={styles.fieldLabel} htmlFor="vector-properties">属性 JSON</label>
        <Input.TextArea
          id="vector-properties"
          rows={5}
          value={editor?.properties ?? ''}
          onChange={(event) => setEditor((previous) => previous && { ...previous, properties: event.target.value })}
        />
      </Modal>
    </div>
  )
}
