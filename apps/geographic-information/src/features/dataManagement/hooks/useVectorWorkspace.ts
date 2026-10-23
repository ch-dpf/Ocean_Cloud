import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import {
  getVectorLayers,
  getVectorFeature,
  getVectorLayer,
  updateVectorFeature,
  deleteVectorFeature,
  deleteVectorLayer,
  getVectorGroups,
  getDatasetVectorStyle,
  updateVectorGroupVisibility,
} from '../services/vectorService'
import type {
  VectorFeature,
  VectorLayer,
  VersionedVectorFeature,
  VectorTileHit,
  VectorClusterHit,
  VectorGeometry,
  VectorGroup,
  DatasetVectorStyle,
} from '../types/vector'

import { parseLayerGeometryKinds } from '../components/VectorCartography/geometryTypes'

function errorText(cause: unknown): string {
  if (cause instanceof RequestError && cause.status === 412)
    return '要素已被其他人修改，草稿已保留，请重新加载后编辑。'
  if (cause instanceof RequestError && cause.status === 409)
    return '数据集显示配置已变化或尚未初始化，请刷新后重试。'
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
  const [groups, setGroups] = useState<readonly VectorGroup[]>([])
  const [groupsEtag, setGroupsEtag] = useState<string | null>(null)
  const [datasetStyle, setDatasetStyle] = useState<DatasetVectorStyle | null>(
    null,
  )
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
        const [records, groupResult, styleResult] = await Promise.all([
          loadAllLayers(dataSetId, controller.signal),
          getVectorGroups(dataSetId, controller.signal),
          getDatasetVectorStyle(dataSetId, controller.signal),
        ])
        if (controller.signal.aborted) return
        setLayers(records)
        setGroups(groupResult.groups)
        setGroupsEtag(groupResult.etag)
        setDatasetStyle(styleResult)
        setVisibleIds((previous) => {
          const valid = previous.filter((id) =>
            records.some(
              (item) =>
                item.layerId === id &&
                item.status === 'READY' &&
                item.enabled &&
                item.styleMode !== 'UNCONFIGURED',
            ),
          )
          return previous.length === 0
            ? records
                .filter(
                  (item) =>
                    item.status === 'READY' &&
                    item.enabled &&
                    item.styleMode !== 'UNCONFIGURED',
                )
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
  /** 删除图层：先取最新版本号再删，成功后立即清掉该图层的选择与草稿。 */
  const removeLayer = useCallback(async (layerId: string) => {
    const latest = await getVectorLayer(layerId)
    await deleteVectorLayer(latest.layer.layerId, latest.etag)
    setLayers((previous) => previous.filter((item) => item.layerId !== layerId))
    setVisibleIds((previous) => previous.filter((id) => id !== layerId))
    setActiveLayerId((previous) => (previous === layerId ? null : previous))
    setSelected((previous) =>
      previous?.feature.layerId === layerId ? null : previous,
    )
    setDraft((previous) => (previous?.layerId === layerId ? null : previous))
    setCluster(null)
    setLayerRevision((value) => value + 1)
    setError(null)
  }, [])

  const setGroupVisibility = useCallback(
    async (groupId: string, enabled: boolean) => {
      if (!groupsEtag) return
      try {
        await updateVectorGroupVisibility(
          dataSetId,
          groupId,
          enabled,
          groupsEtag,
        )
        setLayerRevision((value) => value + 1)
      } catch (cause) {
        setError(errorText(cause))
      }
    },
    [dataSetId, groupsEtag],
  )

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
    layerKinds,
    layers,
    groups,
    datasetStyle,
    setGroupVisibility,
    visibleIds,
    activeLayerId,
    setActiveLayerId,
    loadingLayers,
    error,
    clearError,
    toggleVisible,
    refreshLayers,
    removeLayer,
    selected,
    loadingFeature,
    savingFeature,
    selectFeature,
    clearSelection,
    saveFeature,
    removeFeature,
  }
}
