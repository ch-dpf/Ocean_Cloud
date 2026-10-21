import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import {
  deleteVectorStyle,
  getDefaultVectorStyle,
  getVectorStyle,
  getVectorStyles,
  matchSavedVectorStyle,
  saveVectorStyle,
  setDefaultVectorStyle,
} from '../services/vectorService'
import type {
  VectorStyleDefinition,
  VectorStyleMatch,
  VectorStyleRule,
  VectorStyleSummary,
  VersionedVectorStyle,
} from '../types/vector'
import { newStyleDefinition } from '../components/VectorCartography/vectorStyle'
import { validateStyleDefinition } from '../components/VectorCartography/vectorStyleValidation'

export interface VectorRuleDraft extends Omit<VectorStyleRule, 'filter'> {
  readonly filterText: string
}
function drafts(style: VectorStyleDefinition): VectorRuleDraft[] {
  return style.rules.map(({ filter, ...rule }) => ({
    ...rule,
    filterText: filter == null ? '' : JSON.stringify(filter, null, 2),
  }))
}
function parseDefinition(
  rules: readonly VectorRuleDraft[],
): VectorStyleDefinition {
  return validateStyleDefinition({
    schemaVersion: 1,
    rules: rules.map(({ filterText, ...rule }) => {
      if (!filterText.trim()) return rule
      try {
        return { ...rule, filter: JSON.parse(filterText) as unknown }
      } catch {
        throw new Error('规则 ' + rule.id + ' 的属性条件不是有效 JSON')
      }
    }),
  })
}
function draftKey(name: string, rules: readonly VectorRuleDraft[]) {
  return JSON.stringify([name, rules])
}

/** 草稿、方案版本和网络请求生命周期；412 保留草稿，不自动覆盖他人的修改。 */
export function useVectorStyleEditor(layerId: string, onPersist: () => void) {
  const [summaries, setSummaries] = useState<readonly VectorStyleSummary[]>([])
  const [existing, setExisting] = useState<VersionedVectorStyle | null>(null)
  const [name, setName] = useState('')
  const [rules, setRules] = useState<readonly VectorRuleDraft[]>(
    drafts(newStyleDefinition()),
  )
  const [baseline, setBaseline] = useState('')
  const [busy, setBusy] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [serverMatch, setServerMatch] = useState<VectorStyleMatch | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const persistRef = useRef(onPersist)
  useEffect(() => {
    persistRef.current = onPersist
  }, [onPersist])
  const install = useCallback((value: VersionedVectorStyle) => {
    validateStyleDefinition(value.style.definition)
    const next = drafts(value.style.definition)
    setExisting(value)
    setName(value.style.name)
    setRules(next)
    setBaseline(draftKey(value.style.name, next))
    setReady(true)
    setServerMatch(null)
  }, [])
  const run = useCallback(
    async (action: (signal: AbortSignal) => Promise<void>) => {
      requestRef.current?.abort()
      const controller = new AbortController()
      requestRef.current = controller
      setBusy(true)
      setError(null)
      setNotice(null)
      try {
        await action(controller.signal)
      } catch (cause) {
        if (controller.signal.aborted) return
        const status = cause instanceof RequestError ? cause.status : undefined
        setError(
          status === 412
            ? '方案已被其他人修改，草稿已保留。请另存为新方案，或重新加载后编辑。'
            : status === 409
              ? '操作冲突：请检查方案名称是否重复，或重新加载确认默认方案。'
              : status === 428
                ? '缺少样式版本，请重新加载方案。'
                : cause instanceof Error
                  ? cause.message
                  : '样式操作失败，请重试',
        )
      } finally {
        if (!controller.signal.aborted) setBusy(false)
      }
    },
    [],
  )
  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => {
      if (!active) return
      return run(async (signal) => {
        const [list, value] = await Promise.all([
          getVectorStyles(layerId, signal),
          getDefaultVectorStyle(layerId, signal),
        ])
        if (signal.aborted) return
        setSummaries(list)
        install(value)
      })
    })
    return () => {
      active = false
      requestRef.current?.abort()
    }
  }, [layerId, install, run])
  const parsed = useMemo(() => {
    try {
      return { definition: parseDefinition(rules), error: null }
    } catch (cause) {
      return {
        definition: null,
        error: cause instanceof Error ? cause.message : '规则无效',
      }
    }
  }, [rules])
  const dirty = ready && draftKey(name, rules) !== baseline
  const select = (styleId: string) =>
    run(async (signal) => {
      const value = await getVectorStyle(layerId, styleId, signal)
      if (!signal.aborted) install(value)
    })
  const reload = () =>
    run(async (signal) => {
      const [list, value] = await Promise.all([
        getVectorStyles(layerId, signal),
        existing
          ? getVectorStyle(layerId, existing.style.styleId, signal)
          : getDefaultVectorStyle(layerId, signal),
      ])
      if (signal.aborted) return
      setSummaries(list)
      install(value)
      persistRef.current()
    })
  const createDraft = (copy: boolean) => {
    setExisting(null)
    const nextName = copy ? name.slice(0, 95) + ' 副本' : ''
    const nextRules = copy ? rules : drafts(newStyleDefinition())
    setName(nextName)
    setRules(nextRules)
    setBaseline('')
    setReady(true)
    setError(null)
    setNotice(null)
    setServerMatch(null)
  }
  const save = () =>
    run(async (signal) => {
      if (!parsed.definition || !name.trim())
        throw new Error(parsed.error ?? '请填写方案名称')
      const value = await saveVectorStyle(
        layerId,
        { name: name.trim(), definition: parsed.definition },
        existing,
        signal,
      )
      if (signal.aborted) return
      install(value)
      persistRef.current()
      setNotice('样式方案已保存')
      const list = await getVectorStyles(layerId, signal)
      if (!signal.aborted) setSummaries(list)
    })
  const makeDefault = () =>
    run(async (signal) => {
      if (!existing) return
      const value = await setDefaultVectorStyle(layerId, existing, signal)
      if (signal.aborted) return
      install(value)
      persistRef.current()
      setNotice('默认样式已切换')
      const list = await getVectorStyles(layerId, signal)
      if (!signal.aborted) setSummaries(list)
    })
  const remove = () =>
    run(async (signal) => {
      if (!existing) return
      await deleteVectorStyle(layerId, existing, signal)
      if (signal.aborted) return
      persistRef.current()
      const [list, value] = await Promise.all([
        getVectorStyles(layerId, signal),
        getDefaultVectorStyle(layerId, signal),
      ])
      if (signal.aborted) return
      setSummaries(list)
      install(value)
      setNotice('样式方案已删除')
    })
  const verify = (featureId: string, zoom: number) =>
    run(async (signal) => {
      if (!existing) return
      const result = await matchSavedVectorStyle(
        layerId,
        existing.style.styleId,
        featureId,
        zoom,
        signal,
      )
      if (!signal.aborted) setServerMatch(result)
    })
  return {
    summaries,
    existing,
    name,
    setName,
    rules,
    setRules,
    ready,
    busy,
    error,
    notice,
    serverMatch,
    definition: parsed.definition,
    validationError: parsed.error,
    dirty,
    select,
    reload,
    createDraft,
    save,
    makeDefault,
    remove,
    verify,
  }
}
