import styles from './ResourceSummary.module.css'
import type { SystemMetrics } from '../../hooks/useSystemMetrics'

interface ResourceSummaryProps {
  readonly metrics: SystemMetrics | null
}

function formatPercent(value: number | undefined): string {
  return value != null ? `${value.toFixed(1)}%` : '--'
}

export function ResourceSummary({ metrics }: ResourceSummaryProps) {
  const items = [
    {
      label: 'CPU 占有率',
      value: formatPercent(metrics?.cpuUsage),
      percent: metrics?.cpuUsage ?? 0,
      detail: '实时',
    },
    {
      label: 'GPU 使用率',
      value: formatPercent(metrics?.gpuUsage),
      percent: metrics?.gpuUsage ?? 0,
      detail: '实时',
    },
    {
      label: '内存使用率',
      value: formatPercent(metrics?.memoryUsage),
      percent: metrics?.memoryUsage ?? 0,
      detail:
        metrics?.usedMemoryGb != null && metrics?.totalMemoryGb != null
          ? `${metrics.usedMemoryGb.toFixed(1)} / ${metrics.totalMemoryGb.toFixed(1)} GB`
          : '暂无数据',
    },
    {
      label: '磁盘使用率',
      value: formatPercent(metrics?.diskUsage),
      percent: metrics?.diskUsage ?? 0,
      detail: '实时',
    },
  ]

  return (
    <section className={styles.summary} aria-label="资源概览">
      {items.map((item) => (
        <article className={styles.item} key={item.label}>
          <h2>{item.label}</h2>
          <div className={styles.valueRow}>
            <strong>{item.value}</strong>
            <span>{item.detail}</span>
          </div>
          <div
            className={`${styles.progress} ${styles.primary}`}
            aria-hidden="true"
          >
            <span style={{ width: `${Math.min(item.percent, 100)}%` }} />
          </div>
        </article>
      ))}
    </section>
  )
}
