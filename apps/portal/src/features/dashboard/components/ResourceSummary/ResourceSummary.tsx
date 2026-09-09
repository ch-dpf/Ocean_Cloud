import styles from './ResourceSummary.module.css'

const RESOURCES = [
  { label: 'CPU占有率', detail: '暂无数据', tone: 'primary' },
  { label: '内存占有率', detail: '暂无数据', tone: 'primary' },
  { label: '磁盘使用率', detail: '剩余--GB', tone: 'primary' },
  { label: '服务状态', detail: '暂无数据', tone: 'green' },
] as const

export function ResourceSummary() {
  return (
    <section className={styles.summary} aria-label="资源概览">
      {RESOURCES.map((resource) => (
        <article className={styles.item} key={resource.label}>
          <h2>{resource.label}</h2>
          <div className={styles.valueRow}>
            <strong>--</strong>
            <span>{resource.detail}</span>
          </div>
          <div
            className={`${styles.progress} ${styles[resource.tone]}`}
            aria-hidden="true"
          >
            <span />
          </div>
        </article>
      ))}
    </section>
  )
}
