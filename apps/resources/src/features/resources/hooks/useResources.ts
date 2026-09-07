import { useEffect, useState } from 'react'
import { RequestError } from '@ocean-cloud/http'
import type { ResourceRecord, ResourceKindFilter } from '../types/resource'
import { listResources } from '../services/resourceService'
export function useResources() {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<ResourceKindFilter>('all')
  const [allResources, setAllResources] = useState<readonly ResourceRecord[]>(
    [],
  )
  const [selectedResource, selectResource] = useState<ResourceRecord | null>(
    null,
  )
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadCount, setReloadCount] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    listResources(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setAllResources(data)
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof RequestError ? cause.message : '资源加载失败。',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false)
      })
    return () => controller.abort()
  }, [reloadCount])
  const resources = allResources.filter(
    (resource) =>
      (kind === 'all' || resource.kind === kind) &&
      `${resource.name} ${resource.format} ${resource.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  )
  function clearSelection() {
    selectResource(null)
  }
  function reload() {
    setIsLoading(true)
    setError(null)
    setReloadCount((count) => count + 1)
  }
  return {
    query,
    kind,
    resources,
    selectedResource,
    isLoading,
    error,
    setQuery,
    setKind,
    selectResource,
    clearSelection,
    reload,
  }
}
