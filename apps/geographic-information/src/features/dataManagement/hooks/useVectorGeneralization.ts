import { useEffect, useRef, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import {
  getVectorGeneralization,
  saveVectorGeneralization,
  rebuildVectorGeneralization,
} from '../services/vectorService'
import type {
  VectorGeneralization,
  VectorGeneralizationPolicy,
  VersionedVectorGeneralization,
} from '../types/vector'

export function useVectorGeneralization(
  layerId: string | undefined,
  onChange: () => void,
) {
  const [state, setState] = useState<VectorGeneralization | null>(null)
  const [draft, setDraft] = useState('')
  const [etag, setEtag] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const notify = useRef(onChange)
  notify.current = onChange
  const currentLayer = useRef(layerId)
  currentLayer.current = layerId
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let published: string | null | undefined
    let first = true
    setBusy(false)
    setState(null)
    setEtag('')
    setDraft('')
    setError(null)
    const load = async () => {
      if (!layerId) {
        setState(null)
        return
      }
      try {
        const result = await getVectorGeneralization(layerId, controller.signal)
        if (controller.signal.aborted) return
        setState(result.state)
        if (first) {
          setDraft(JSON.stringify(result.state.policy, null, 2))
          setEtag(result.etag)
          setError(null)
          first = false
        }
        const id = result.state.publishedBuild?.buildId ?? null
        if (published !== undefined && id !== published) notify.current()
        published = id ?? null
        timer = setTimeout(load, 5000)
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : '概览状态加载失败')
      }
    }
    void load()
    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [layerId, revision])
  const apply = (result: VersionedVectorGeneralization) => {
    setState(result.state)
    setEtag(result.etag)
    setDraft(JSON.stringify(result.state.policy, null, 2))
    notify.current()
  }
  const submit = async (rebuild: boolean) => {
    if (!layerId || busy || !etag) return
    setBusy(true)
    setError(null)
    try {
      const result = rebuild
        ? await rebuildVectorGeneralization(layerId, etag)
        : await saveVectorGeneralization(
            layerId,
            JSON.parse(draft) as VectorGeneralizationPolicy,
            etag,
          )
      if (currentLayer.current === layerId) apply(result)
    } catch (cause) {
      if (currentLayer.current === layerId)
        setError(
          cause instanceof RequestError && cause.status === 412
            ? '概化策略已被修改，草稿已保留。请复制草稿后重新加载。'
            : cause instanceof Error
              ? cause.message
              : '提交失败',
        )
    } finally {
      if (currentLayer.current === layerId) setBusy(false)
    }
  }
  const build = state?.latestBuild
  const progress =
    build?.status === 'READY'
      ? 100
      : Math.min(
          99,
          Math.round(
            (((build?.completedZoom ?? -1) + 1) /
              (state?.policy.detailMinZoom ?? 13)) *
              100,
          ),
        )
  const progressStatus =
    build?.status === 'FAILED'
      ? 'exception'
      : build?.status === 'READY'
        ? 'success'
        : 'active'
  return {
    progress,
    progressStatus,
    state,
    draft,
    setDraft,
    busy,
    error,
    save: () => submit(false),
    rebuild: () => submit(true),
    reload: () => setRevision((v) => v + 1),
  }
}

export function parseGeneralizationPolicy(
  text: string,
): VectorGeneralizationPolicy | null {
  try {
    const value = JSON.parse(text) as VectorGeneralizationPolicy
    return value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof value.enabled === 'boolean' &&
      Number.isInteger(value.detailMinZoom) &&
      Array.isArray(value.groupFields) &&
      value.groupFields.every((f) => typeof f === 'string') &&
      ['SIMPLIFY', 'BUILDINGS', 'COVERAGE'].includes(value.polygonMode)
      ? value
      : null
  } catch {
    return null
  }
}
export function generalizationPreset(
  policy: VectorGeneralizationPolicy,
  value: string,
): VectorGeneralizationPolicy {
  const roads = value === 'ROADS',
    water = value === 'WATERWAYS'
  return {
    ...policy,
    enabled: true,
    polygonMode:
      value === 'BUILDINGS'
        ? 'BUILDINGS'
        : value === 'COVERAGE'
          ? 'COVERAGE'
          : 'SIMPLIFY',
    groupFields: roads || water ? ['fclass'] : [],
    lineClassField: roads || water ? 'fclass' : null,
    defaultLineMinZoom: roads || water ? 10 : 0,
    lineMinZoom: roads
      ? {
          motorway: 0,
          motorway_link: 0,
          trunk: 4,
          trunk_link: 4,
          primary: 6,
          primary_link: 6,
          secondary: 9,
          secondary_link: 9,
          tertiary: 11,
          tertiary_link: 11,
          residential: 12,
          service: 13,
          footway: 14,
          path: 14,
        }
      : water
        ? { river: 0, canal: 8, stream: 10, drain: 12 }
        : {},
    minPolygonPixels: value === 'COVERAGE' ? 0 : 2,
  }
}
