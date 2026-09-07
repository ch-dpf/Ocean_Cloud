import type { ResourceKind, ResourceKindFilter } from '../types/resource'
export const RESOURCE_KIND_LABELS: Readonly<Record<ResourceKind, string>> = {
  imagery: '影像',
  vector: '矢量',
  terrain: '地形',
}
export const RESOURCE_FILTER_OPTIONS: readonly {
  value: ResourceKindFilter
  label: string
}[] = [
  { value: 'all', label: '全部' },
  { value: 'imagery', label: '影像' },
  { value: 'vector', label: '矢量' },
  { value: 'terrain', label: '地形' },
]
