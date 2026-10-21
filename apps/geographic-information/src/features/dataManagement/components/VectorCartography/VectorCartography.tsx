import { useCallback, useMemo, useState } from 'react'
import { Alert, Spin } from 'antd'
import { useVectorWorkspace } from '../../hooks/useVectorWorkspace'
import type { VectorFeature } from '../../types/vector'
import {
  collectGeometryKinds,
  parseLayerGeometryKinds,
  sortGeometryKinds,
  type GeometryKind,
} from './geometryTypes'
import { VectorFeaturePanel } from './VectorFeaturePanel'
import { VectorLayerList } from './VectorLayerList'
import { VectorMap } from './VectorMap'
import {
  DEFAULT_FEATURE_STYLE,
  featureStyleKey,
  type FeatureStyleSetting,
} from './vectorStyle'
import styles from './VectorCartography.module.css'

interface VectorCartographyProps {
  readonly dataSetId: string
}

/** 矢量数据集专属工作区：按视窗加载要素，支持颜色与起始显示层级调整。 */
export function VectorCartography({ dataSetId }: VectorCartographyProps) {
  const {
    layers,
    visibleIds,
    activeLayerId,
    setActiveLayerId,
    features,
    loadingLayers,
    loadingFeatures,
    truncated,
    error,
    clearError,
    setBbox,
    toggleVisible,
    refreshLayers,
  } = useVectorWorkspace(dataSetId)
  const [selected, setSelected] = useState<VectorFeature | null>(null)
  const [featureStyles, setFeatureStyles] = useState<
    Readonly<Record<string, FeatureStyleSetting>>
  >({})

  const layerKinds = useMemo(() => {
    const result: Record<string, readonly GeometryKind[]> = {}
    for (const layer of layers) {
      const parsed = parseLayerGeometryKinds(layer.geometryTypes)
      if (parsed.length > 0) result[layer.layerId] = parsed
    }
    const loaded = new Map<string, Set<GeometryKind>>()
    for (const feature of features) {
      const kinds = loaded.get(feature.layerId) ?? new Set<GeometryKind>()
      collectGeometryKinds(feature.geometry, kinds)
      loaded.set(feature.layerId, kinds)
    }
    for (const [layerId, kinds] of loaded) {
      if (!result[layerId]) result[layerId] = sortGeometryKinds(kinds)
    }
    return result
  }, [layers, features])

  const activeLayer =
    layers.find((item) => item.layerId === activeLayerId) ?? null
  const focusGeometry = activeLayer?.extent ?? null
  const selectedKey = selected
    ? featureStyleKey(selected.layerId, selected.id)
    : null
  const selectedStyle = selectedKey
    ? (featureStyles[selectedKey] ?? DEFAULT_FEATURE_STYLE)
    : DEFAULT_FEATURE_STYLE
  const selectedLayerName = selected
    ? (layers.find((item) => item.layerId === selected.layerId)?.layerName ??
      selected.layerId)
    : ''

  const handleStyleChange = useCallback(
    (setting: FeatureStyleSetting) => {
      if (!selected) return
      const key = featureStyleKey(selected.layerId, selected.id)
      setFeatureStyles((previous) => ({ ...previous, [key]: setting }))
    },
    [selected],
  )
  const handleStyleReset = useCallback(() => {
    if (!selected) return
    const key = featureStyleKey(selected.layerId, selected.id)
    setFeatureStyles((previous) => {
      const next = { ...previous }
      delete next[key]
      return next
    })
  }, [selected])

  return (
    <div className={styles.workspace}>
      <aside className={styles.sidebar}>
        <VectorLayerList
          layers={layers}
          visibleIds={visibleIds}
          activeLayerId={activeLayerId}
          loading={loadingLayers}
          layerKinds={layerKinds}
          onToggleVisible={toggleVisible}
          onActivate={setActiveLayerId}
          onRefresh={refreshLayers}
        />
        <div className={styles.panelTitle}>要素</div>
        {selected ? (
          <VectorFeaturePanel
            feature={selected}
            layerName={selectedLayerName}
            setting={selectedStyle}
            onChange={handleStyleChange}
            onReset={handleStyleReset}
          />
        ) : (
          <p className={styles.hint}>
            点击地图中的要素查看属性，并可设置颜色和起始显示层级。
          </p>
        )}
      </aside>
      <section className={styles.mapPanel}>
        <div className={styles.toolbar}>
          <span>已加载 {features.length} 个要素</span>
          {loadingFeatures && <Spin size="small" />}
        </div>
        {error && (
          <Alert
            type="error"
            showIcon
            message={error}
            closable
            onClose={clearError}
          />
        )}
        {truncated && (
          <Alert
            type="warning"
            showIcon
            message="当前视窗要素超过 2000 个，仅显示前 2000 个；请放大地图缩小查询范围。"
          />
        )}
        <VectorMap
          features={features}
          focusGeometry={focusGeometry}
          selectedFeatureKey={selectedKey}
          featureStyles={featureStyles}
          onBboxChange={setBbox}
          onSelect={setSelected}
        />
      </section>
    </div>
  )
}
