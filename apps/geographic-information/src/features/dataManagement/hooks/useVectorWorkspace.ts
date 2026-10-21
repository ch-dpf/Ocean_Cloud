import { useCallback, useEffect, useMemo, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import {
  getVectorFeatures,
  getVectorLayer,
  getVectorLayers,
  deleteVectorLayer,
} from '../services/vectorService'
import type { VectorBbox, VectorFeature, VectorLayer } from '../types/vector'

const MAX_FEATURES = 2000

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message
  return '请求失败，请稍后重试'
}

async function loadAllLayers(
  dataSetId: string,
  signal: AbortSignal,
): Promise<VectorLayer[]> {
  const all: VectorLayer[] = []
  for (let pageNo = 1; ; pageNo += 1) {
    const page = await getVectorLayers(dataSetId, pageNo, 100, signal)
    all.push(...page.records)
    if (page.records.length === 0 || all.length >= Number(page.total))
      return all
  }
}

/** 图层目录与视窗要素的加载、可见图层切换和几何类型汇总。 */
export function useVectorWorkspace(dataSetId: string) {
  const [layers, setLayers] = useState<readonly VectorLayer[]>([])
  const [visibleIds, setVisibleIds] = useState<readonly string[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [features, setFeatures] = useState<readonly VectorFeature[]>([])
  const [bbox, setBbox] = useState<VectorBbox | null>(null)
  const [loadingLayers, setLoadingLayers] = useState(false)
  const [loadingFeatures, setLoadingFeatures] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
          const valid = previous.filter((id) =>
            records.some(
              (item) => item.layerId === id && item.status === 'READY',
            ),
          )
          return previous.length === 0
            ? records
                .filter((item) => item.status === 'READY')
                .map((item) => item.layerId)
            : valid
        })
        setActiveLayerId((previous) =>
          records.some(
            (item) => item.layerId === previous && item.status === 'READY',
          )
            ? previous
            : (records.find((item) => item.status === 'READY')?.layerId ??
              null),
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
    () =>
      layers.filter(
        (item) => item.status === 'READY' && visibleIds.includes(item.layerId),
      ),
    [layers, visibleIds],
  )
  const visibleKey = visibleReady
    .map((item) => `${item.layerId}:${item.dataVersion}`)
    .join(',')

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
        // 游标在并发写入后可能过期（409）；从第一页重查一次即可。
        for (let attempt = 0; attempt < 2; attempt += 1) {
          loaded = []
          limited = false
          try {
            for (const [index, layer] of visibleReady.entries()) {
              let cursor: string | undefined
              for (;;) {
                const page = await getVectorFeatures(
                  layer.layerId,
                  bbox,
                  cursor,
                  controller.signal,
                )
                loaded.push(...page.features)
                if (loaded.length >= MAX_FEATURES) {
                  limited =
                    page.hasMore ||
                    index < visibleReady.length - 1 ||
                    loaded.length > MAX_FEATURES
                  break
                }
                if (!page.hasMore || !page.nextCursor) break
                cursor = page.nextCursor
              }
              if (loaded.length >= MAX_FEATURES) break
            }
            break
          } catch (cause) {
            if (
              !(cause instanceof RequestError) ||
              cause.status !== 409 ||
              attempt === 1
            )
              throw cause
          }
        }
        if (controller.signal.aborted) return
        setFeatures(loaded.slice(0, MAX_FEATURES))
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
  }, [bbox, visibleKey])

  const toggleVisible = useCallback((layerId: string, visible: boolean) => {
    setVisibleIds((previous) =>
      visible
        ? previous.includes(layerId)
          ? previous
          : [...previous, layerId]
        : previous.filter((id) => id !== layerId),
    )
  }, [])
  const refreshLayers = useCallback(
    () => setLayerRevision((value) => value + 1),
    [],
  )
  const clearError = useCallback(() => setError(null), [])
  /** 删除图层：先取最新版本号再删，成功后立即从当前列表和要素中移除。 */
  const removeLayer = useCallback(async (layerId: string) => {
    const latest = await getVectorLayer(layerId)
    await deleteVectorLayer(latest.layerId, latest.dataVersion)
    setLayers((previous) => previous.filter((item) => item.layerId !== layerId))
    setVisibleIds((previous) => previous.filter((id) => id !== layerId))
    setActiveLayerId((previous) => (previous === layerId ? null : previous))
    setFeatures((previous) =>
      previous.filter((feature) => feature.layerId !== layerId),
    )
    setLayerRevision((value) => value + 1)
    setError(null)
  }, [])

  return {
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
    removeLayer,
  }
}
