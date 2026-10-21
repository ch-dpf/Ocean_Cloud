import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import {
  getVectorLayers,
  getVectorFeature,
  updateVectorFeature,
  deleteVectorFeature,
} from '../services/vectorService'
import type {
  VectorFeature,
  VectorLayer,
  VersionedVectorFeature,
  VectorTileHit,
  VectorClusterHit,
  VectorGeometry,
} from '../types/vector'

import { parseLayerGeometryKinds } from '../components/VectorCartography/geometryTypes'

function errorText(cause: unknown): string {
  if (cause instanceof RequestError && cause.status === 412)
    return '要素已被其他人修改，草稿已保留，请重新加载后编辑。'
  return cause instanceof Error ? cause.message : '请求失败，请稍后重试'
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

/** 图层目录与原始要素编辑；地图展示交给独立瓦片通道。 */
export function useVectorWorkspace(dataSetId: string) {
  const [layers, setLayers] = useState<readonly VectorLayer[]>([])
  const [visibleIds, setVisibleIds] = useState<readonly string[]>([])
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null)
  const [loadingLayers, setLoadingLayers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [layerRevision, setLayerRevision] = useState(0)
  const [selected, setSelected] = useState<VersionedVectorFeature | null>(null)
  const [loadingFeature, setLoadingFeature] = useState(false)
  const [savingFeature, setSavingFeature] = useState(false)
  const [draft, setDraft] = useState<VectorFeature | null>(null)
  const [cluster, setCluster] = useState<VectorClusterHit | null>(null)
  const [zoomTarget, setZoomTarget] = useState<VectorClusterHit | null>(null)
  const selectionRequest = useRef<AbortController | null>(null)
  const editRequest = useRef<AbortController | null>(null)
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

  useEffect(
    () => () => {
      selectionRequest.current?.abort()
      editRequest.current?.abort()
    },
    [],
  )
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

  const selectFeature = useCallback(
    async (layerId: string, featureId: string) => {
      selectionRequest.current?.abort()
      const controller = new AbortController()
      selectionRequest.current = controller
      setLoadingFeature(true)
      setSelected(null)
      setError(null)
      try {
        const value = await getVectorFeature(
          layerId,
          featureId,
          controller.signal,
        )
        if (!controller.signal.aborted) setSelected(value)
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorText(cause))
      } finally {
        if (!controller.signal.aborted) setLoadingFeature(false)
      }
    },
    [],
  )
  const clearSelection = useCallback(() => {
    selectionRequest.current?.abort()
    setSelected(null)
    setLoadingFeature(false)
  }, [])
  const saveFeature = async (draft: VectorFeature): Promise<boolean> => {
    if (!selected) return false
    const controller = new AbortController()
    editRequest.current = controller
    setSavingFeature(true)
    setError(null)
    try {
      const updated = await updateVectorFeature(
        selected,
        draft,
        controller.signal,
      )
      if (controller.signal.aborted) return false
      setSelected(updated)
      refreshLayers()
      return true
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorText(cause))
      return false
    } finally {
      if (!controller.signal.aborted) setSavingFeature(false)
    }
  }
  const removeFeature = async (): Promise<boolean> => {
    if (!selected) return false
    const controller = new AbortController()
    editRequest.current = controller
    setSavingFeature(true)
    setError(null)
    try {
      await deleteVectorFeature(selected, controller.signal)
      if (controller.signal.aborted) return false
      setSelected(null)
      refreshLayers()
      return true
    } catch (cause) {
      if (!controller.signal.aborted) setError(errorText(cause))
      return false
    } finally {
      if (!controller.signal.aborted) setSavingFeature(false)
    }
  }
  const visibleLayers = useMemo(
    () =>
      layers.filter(
        (layer) =>
          layer.status === 'READY' && visibleIds.includes(layer.layerId),
      ),
    [layers, visibleIds],
  )
  const layerKinds = useMemo(
    () =>
      Object.fromEntries(
        layers.map((layer) => [
          layer.layerId,
          parseLayerGeometryKinds(layer.geometryTypes),
        ]),
      ),
    [layers],
  )
  const handleSelect = (hit: VectorTileHit | null) => {
    if (draft) return
    if (hit && hit.kind !== 'feature') {
      setCluster(hit)
      clearSelection()
    } else {
      setCluster(null)
      if (hit) void selectFeature(hit.layerId, hit.featureId)
      else clearSelection()
    }
  }
  const selectClusterMember = (layerId: string, featureId: string) => {
    setCluster(null)
    void selectFeature(layerId, featureId)
  }
  const zoomCluster = () => {
    if (cluster) setZoomTarget({ ...cluster })
    setCluster(null)
  }
  const changeGeometry = (geometry: VectorGeometry) =>
    setDraft((value) => (value ? { ...value, geometry } : null))
  return {
    draft,
    setDraft,
    cluster,
    setCluster,
    zoomTarget,
    handleSelect,
    selectClusterMember,
    zoomCluster,
    changeGeometry,
    visibleLayers,
    layerKinds,
    layers,
    visibleIds,
    activeLayerId,
    setActiveLayerId,
    loadingLayers,
    error,
    clearError,
    toggleVisible,
    refreshLayers,
    selected,
    loadingFeature,
    savingFeature,
    selectFeature,
    clearSelection,
    saveFeature,
    removeFeature,
  }
}
