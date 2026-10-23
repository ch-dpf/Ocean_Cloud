import { useCallback, useEffect, useRef, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import {
  getVectorMapDefinition,
  getVectorCartography,
} from '../services/vectorService'
import type {
  VectorMapDefinition,
  VectorCartographyDefinition,
} from '../types/vector'

/** 视窗移动、连续zoom和临时显隐均不改变地图数据源。 */
export function useVectorTiles(
  dataSetId: string,
  dataRevision: number,
  onDataStale: () => void,
) {
  const [pending, setPending] = useState(0)
  const [tileError, setTileError] = useState<string | null>(null)
  const [context, setContext] = useState<VectorMapDefinition | null>(null)
  const [cartography, setCartography] =
    useState<VectorCartographyDefinition | null>(null)
  const [cartographyEtag, setCartographyEtag] = useState('')
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const recoveringVersion = useRef<string | null>(null)
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      getVectorMapDefinition(dataSetId, controller.signal),
      getVectorCartography(dataSetId, controller.signal),
    ])
      .then(([definition, config]) => {
        if (controller.signal.aborted) return
        setContext((previous) =>
          previous?.tileVersion === definition.tileVersion
            ? previous
            : definition,
        )
        setCartography((previous) =>
          previous?.dataSetId === config.definition.dataSetId &&
          previous.styleVersion === config.definition.styleVersion
            ? previous
            : config.definition,
        )
        setCartographyEtag(config.etag)
        setTileError(null)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setTileError(
            cause instanceof Error ? cause.message : '地图定义加载失败',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [dataSetId, dataRevision, revision])
  useEffect(() => {
    const focus = () => refresh()
    window.addEventListener('focus', focus)
    return () => window.removeEventListener('focus', focus)
  }, [refresh])
  const handleTileError = (cause: unknown) => {
    if (
      cause instanceof RequestError &&
      cause.status === 410 &&
      context &&
      recoveringVersion.current !== context.tileVersion
    ) {
      recoveringVersion.current = context.tileVersion
      onDataStale()
      refresh()
      return
    }
    setTileError(
      cause instanceof RequestError && cause.status === 422
        ? '当前瓦片超过完整几何预算，请放大地图；服务端未截断要素。'
        : cause instanceof Error
          ? cause.message
          : '瓦片加载失败',
    )
  }
  return {
    context: context?.dataSetId === dataSetId ? context : null,
    cartography: cartography?.dataSetId === dataSetId ? cartography : null,
    retryRevision: revision,
    cartographyEtag,
    loading,
    pending,
    tileError,
    handleTileError,
    changePending: useCallback(
      (delta: number) => setPending((value) => Math.max(0, value + delta)),
      [],
    ),
    clearError: () => setTileError(null),
    refresh,
  }
}
