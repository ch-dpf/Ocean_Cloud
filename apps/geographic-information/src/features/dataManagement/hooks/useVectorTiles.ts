import { useCallback, useEffect, useMemo, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import { createVectorRenderContext } from '../services/vectorService'
import type {
  VectorLayer,
  VectorRenderContext,
  VectorStyleDefinition,
} from '../types/vector'
import {
  vectorRenderBuffer,
  vectorRenderFields,
} from '../components/VectorCartography/vectorStyle'

export function useVectorTiles(
  layers: readonly VectorLayer[],
  definitions: Readonly<Record<string, VectorStyleDefinition>>,
  onDataStale: () => void,
  zoom: number,
) {
  const [aggregatePoints, setAggregate] = useState(true)
  const [pending, setPending] = useState(0)
  const [tileError, setTileError] = useState<string | null>(null)
  const [contexts, setContexts] = useState<
    Readonly<Record<string, VectorRenderContext>>
  >({})
  const [errors, setErrors] = useState<readonly string[]>([])
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  const plan = layers
    .filter((layer) =>
      definitions[layer.layerId]?.rules.some(
        (rule) =>
          rule.visible !== false &&
          !!rule.symbol &&
          (rule.minZoom == null || zoom >= rule.minZoom) &&
          (rule.maxZoom == null || zoom < rule.maxZoom),
      ),
    )
    .map((layer) => ({
      id: layer.layerId,
      version: String(layer.dataVersion),
      fields: vectorRenderFields(definitions[layer.layerId]),
      buffer: vectorRenderBuffer(definitions[layer.layerId]),
    }))
  // 颜色、透明度与层级变化不会重载瓦片；仅字段、缓冲范围、数据版本和聚合方式影响显示数据。
  const planKey = JSON.stringify([plan, aggregatePoints, revision])
  useEffect(() => {
    const controller = new AbortController()
    const [items, aggregate] = JSON.parse(planKey) as [typeof plan, boolean]
    void (async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setLoading(true)
      setErrors([])
      // 轮询构建状态时保留仍有效的图层通道。
      const results = await Promise.allSettled(
        items.map((item) =>
          createVectorRenderContext(
            item.id,
            item.fields,
            aggregate,
            item.buffer,
            controller.signal,
          ),
        ),
      )
      if (controller.signal.aborted) return
      const next: Record<string, VectorRenderContext> = {},
        failures: string[] = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') next[items[index].id] = result.value
        else
          failures.push(
            '图层 ' +
              items[index].id +
              '：' +
              (result.reason instanceof Error
                ? result.reason.message
                : '渲染上下文加载失败'),
          )
      })
      setContexts(next)
      setErrors(failures)
      setLoading(false)
    })()
    return () => controller.abort()
  }, [planKey])
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  // 版本变化的一帧中也不继续展示已失效的旧上下文。
  const currentContexts = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(contexts).filter(([id, context]) =>
          layers.some(
            (layer) =>
              layer.layerId === id &&
              String(layer.dataVersion) === context.dataVersion,
          ),
        ),
      ),
    [contexts, layers],
  )
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
        ? '当前层级超出显示预算，请调整概化策略或放大查看明细。'
        : cause instanceof Error
          ? cause.message
          : '瓦片加载失败，请重试',
    )
  }
  const building = Object.values(contexts).some((c) =>
    ['QUEUED', 'RUNNING'].includes(c.overviewStatus),
  )
  useEffect(() => {
    if (!building) return
    const timer = window.setInterval(refresh, 5000)
    return () => window.clearInterval(timer)
  }, [building, refresh])
  const overviewMessages = Object.values(currentContexts)
    .filter(
      (c) =>
        zoom <= c.overviewMaxZoom && !c.overviewAvailable && c.overviewMessage,
    )
    .map(
      (c) =>
        (layers.find((l) => l.layerId === c.layerId)?.layerName ?? c.layerId) +
        '：' +
        c.overviewMessage,
    )
  const changePending = (delta: number) =>
    setPending((value) => Math.max(0, value + delta))
  const clearError = () => setTileError(null)
  return {
    aggregatePoints,
    overviewMessages,
    setAggregate,
    pending,
    tileError,
    handleTileError,
    changePending,
    clearError,
    contexts: currentContexts,
    errors,
    loading,
    refresh,
  }
}
