import { useCallback, useEffect, useState } from 'react'
import { getEffectiveVectorStyle } from '../services/vectorService'
import type { EffectiveVectorStyle, VectorLayer } from '../types/vector'

/** 有效样式仅供配置面板展示；地图显示由数据集上下文和 MVT 中的符号驱动。 */
export function useVectorStyles(layers: readonly VectorLayer[]) {
  const [defaults, setDefaults] = useState<
    Readonly<Record<string, EffectiveVectorStyle>>
  >({})
  const [errors, setErrors] = useState<readonly string[]>([])
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  const layerIds = layers
    .filter((layer) => layer.status === 'READY')
    .map((layer) => layer.layerId)
    .sort()
    .join(',')
  useEffect(() => {
    const controller = new AbortController()
    const ids = layerIds ? layerIds.split(',') : []
    void (async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setErrors([])
      setLoading(true)
      const results = await Promise.allSettled(
        ids.map((id) => getEffectiveVectorStyle(id, controller.signal)),
      )
      if (controller.signal.aborted) return
      const next: Record<string, EffectiveVectorStyle> = {}
      const failures: string[] = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          next[ids[index]] = result.value
        } else
          failures.push(
            '图层 ' +
              ids[index] +
              '：' +
              (result.reason instanceof Error
                ? result.reason.message
                : '样式加载失败'),
          )
      })
      setDefaults(next)
      setErrors(failures)
      setLoading(false)
    })()
    return () => controller.abort()
  }, [layerIds, revision])
  const refresh = useCallback(() => setRevision((value) => value + 1), [])
  return { defaults, errors, loading, refresh }
}
