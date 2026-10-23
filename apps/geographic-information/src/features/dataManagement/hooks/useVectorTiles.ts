import { useCallback, useEffect, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import { createVectorRenderContext } from '../services/vectorService'
import type { VectorRenderContext, VectorViewport } from '../types/vector'

/** 整个数据集只维护一个当前视窗上下文；过时请求不会覆盖最新视窗。 */
export function useVectorTiles(
  dataSetId: string,
  viewport: VectorViewport | null,
  enabledLayerIds: readonly string[],
  onDataStale: () => void,
) {
  const [pending, setPending] = useState(0)
  const [tileError, setTileError] = useState<string | null>(null)
  const [resolvedContext, setResolvedContext] = useState<{
    readonly key: string
    readonly value: VectorRenderContext
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  const contextKey = viewport
    ? JSON.stringify([dataSetId, viewport, enabledLayerIds, revision])
    : null
  // 视窗、图层或版本变化后立刻停用旧上下文，避免继续显示上一视窗的裁剪/聚合结果。
  const context =
    resolvedContext?.key === contextKey ? resolvedContext.value : null
  useEffect(() => {
    if (!viewport || !contextKey) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setLoading(true)
      setTileError(null)
      void createVectorRenderContext(
        dataSetId,
        { ...viewport, enabledLayerIds },
        controller.signal,
      )
        .then((value) => {
          if (!controller.signal.aborted)
            setResolvedContext({ key: contextKey, value })
        })
        .catch((cause: unknown) => {
          if (controller.signal.aborted) return
          setTileError(
            cause instanceof RequestError && cause.status === 409
              ? '数据集显示配置已变化或尚未初始化，请刷新后重试。'
              : cause instanceof Error
                ? cause.message
                : '渲染上下文加载失败',
          )
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 180)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [contextKey, dataSetId, viewport, enabledLayerIds])

  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  const handleTileError = (cause: unknown) => {
    if (cause instanceof RequestError && cause.status === 409) {
      onDataStale()
      refresh()
      return
    }
    if (cause instanceof RequestError && cause.status === 410) {
      refresh()
      return
    }
    setTileError(
      cause instanceof RequestError && cause.status === 422
        ? '当前视窗超出安全显示预算，请缩小视窗或减少启用图层。'
        : cause instanceof Error
          ? cause.message
          : '瓦片加载失败，请重试',
    )
  }
  return {
    context,
    loading,
    pending,
    tileError,
    handleTileError,
    changePending: (delta: number) =>
      setPending((value) => Math.max(0, value + delta)),
    clearError: () => setTileError(null),
    refresh,
  }
}
