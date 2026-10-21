import { useCallback, useEffect, useState } from 'react'
import { getDefaultVectorStyle } from '../services/vectorService'
import type { VectorLayer, VectorStyle } from '../types/vector'
import { validateStyleDefinition } from '../components/VectorCartography/vectorStyleValidation'

/** 每个数据图层独立加载默认方案；失败时明确提示，不用本地颜色掩盖错误。 */
export function useVectorStyles(layers: readonly VectorLayer[]) {
  const [defaults, setDefaults] = useState<
    Readonly<Record<string, VectorStyle>>
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
        ids.map((id) => getDefaultVectorStyle(id, controller.signal)),
      )
      if (controller.signal.aborted) return
      const next: Record<string, VectorStyle> = {}
      const failures: string[] = []
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          try {
            validateStyleDefinition(result.value.style.definition)
            next[ids[index]] = result.value.style
          } catch (error) {
            failures.push(
              '图层 ' +
                ids[index] +
                '：' +
                (error instanceof Error ? error.message : '样式定义无效'),
            )
          }
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
