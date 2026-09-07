import styles from './ResourceFilters.module.css'
import type { ResourceKindFilter } from '../../types/resource'
import { RESOURCE_FILTER_OPTIONS } from '../../constants/resource'
interface ResourceFiltersProps {
  readonly query: string
  readonly kind: ResourceKindFilter
  readonly onQueryChange: (query: string) => void
  readonly onKindChange: (kind: ResourceKindFilter) => void
}
export function ResourceFilters({
  query,
  kind,
  onQueryChange,
  onKindChange,
}: ResourceFiltersProps) {
  return (
    <div className={styles.toolbar}>
      <div className={styles.filters}>
        {RESOURCE_FILTER_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            aria-pressed={kind === option.value}
            className={kind === option.value ? styles.selected : ''}
            onClick={() => onKindChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <input
        className={styles.searchInput}
        aria-label="搜索资源"
        placeholder="搜索资源名称、格式或编号…"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </div>
  )
}
