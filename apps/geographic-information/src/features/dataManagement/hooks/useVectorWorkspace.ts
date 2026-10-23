import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import {
  getVectorFeature,
  getVectorLayer,
  updateVectorFeature,
  deleteVectorFeature,
  deleteVectorLayer,
  getVectorGroups,
  getDatasetVectorStyle,
} from '../services/vectorService'
import type {
  VectorFeature,
  VectorLayer,
  VersionedVectorFeature,
  VectorTileHit,
  VectorGeometry,
  VectorGroup,
  DatasetVectorStyle,
} from '../types/vector'

function errorText(cause: unknown): string {
  if (cause instanceof RequestError && cause.status === 412)
    return '要素已被其他人修改，草稿已保留，请重新加载后编辑。'
  if (cause instanceof RequestError && cause.status === 409)
    return '数据集显示配置已变化或尚未初始化，请刷新后重试。'
  return cause instanceof Error ? cause.message : '请求失败，请稍后重试'
}

/** 图层目录与原始要素编辑；地图展示交给独立瓦片通道。 */
export function useVectorWorkspace(dataSetId: string) {
  const [layers, setLayers] = useState<readonly VectorLayer[]>([])
  const [groups, setGroups] = useState<readonly VectorGroup[]>([])
  const [datasetStyle, setDatasetStyle] = useState<DatasetVectorStyle | null>(
    null,
  )
  const [hiddenGroupIds, setHiddenGroupIds] = useState<ReadonlySet<string>>(
    new Set(),
  )
  const [loadingLayers, setLoadingLayers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [layerRevision, setLayerRevision] = useState(0)
  const [selected, setSelected] = useState<VersionedVectorFeature | null>(null)
  const [loadingFeature, setLoadingFeature] = useState(false)
  const [savingFeature, setSavingFeature] = useState(false)
  const [draft, setDraft] = useState<VectorFeature | null>(null)
  const selectionRequest = useRef<AbortController | null>(null)
  const editRequest = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      setLoadingLayers(true)
      try {
        const [groupResult, styleResult] = await Promise.all([
          getVectorGroups(dataSetId, controller.signal),
          getDatasetVectorStyle(dataSetId, controller.signal),
        ])
        if (controller.signal.aborted) return
        setGroups(groupResult.groups)
        setDatasetStyle(styleResult)
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
    setSelected((previous) =>
      previous?.feature.layerId === layerId ? null : previous,
    )
    setDraft((previous) => (previous?.layerId === layerId ? null : previous))
    setLayerRevision((value) => value + 1)
    setError(null)
  }, [])

  const setGroupVisibility = useCallback(
    (groupId: string, enabled: boolean) => {
      setHiddenGroupIds((previous) => {
        const next = new Set(previous)
        if (enabled) next.delete(groupId)
        else next.add(groupId)
        return next
      })
    },
    [],
  )
  const hiddenGroups = useMemo(() => {
    const hidden = new Set<string>()
    const visit = (nodes: readonly VectorGroup[], ancestorHidden: boolean) =>
      nodes.forEach((group) => {
        const disabled = ancestorHidden || hiddenGroupIds.has(group.id)
        if (disabled) hidden.add(group.id)
        visit(group.children, disabled)
      })
    visit(groups, false)
    return hidden
  }, [groups, hiddenGroupIds])

  const selectFeature = useCallback(
    async (layerId: string, featureId: string) => {
      selectionRequest.current?.abort()
      const controller = new AbortController()
      selectionRequest.current = controller
      setLoadingFeature(true)
      setSelected(null)
      setError(null)
      try {
        const [value, layer] = await Promise.all([
          getVectorFeature(layerId, featureId, controller.signal),
          getVectorLayer(layerId, controller.signal),
        ])
        if (!controller.signal.aborted) {
          setSelected(value)
          setLayers((previous) => [
            ...previous.filter((item) => item.layerId !== layerId),
            layer.layer,
          ])
        }
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
  const handleSelect = (hit: VectorTileHit | null) => {
    if (draft) return
    if (hit) void selectFeature(hit.layerId, hit.featureId)
    else clearSelection()
  }
  const changeGeometry = (geometry: VectorGeometry) =>
    setDraft((value) => (value ? { ...value, geometry } : null))
  return {
    draft,
    setDraft,
    handleSelect,
    changeGeometry,
    layerRevision,
    hiddenGroups,
    layers,
    groups,
    datasetStyle,
    setGroupVisibility,
    loadingLayers,
    error,
    clearError,
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
