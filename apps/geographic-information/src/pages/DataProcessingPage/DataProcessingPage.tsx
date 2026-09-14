import { useState } from 'react'
import styles from './DataProcessingPage.module.css'

const PROCESS_TYPES = [
  '全部任务',
  '影像处理',
  '矢量处理',
  '地形处理',
  '倾斜摄影处理',
  '电子海图处理',
] as const

export function DataProcessingPage() {
  const [selectedType, setSelectedType] = useState<string>(PROCESS_TYPES[0])
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    () => new Set(),
  )

  function toggleType(type: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  return (
    <section className={styles.page}>
      <div className={styles.sideBar}>
        <div className={styles.sideBarHeader}>
          <div className={styles.sideBarTitle}>全部任务</div>
          <div className={styles.sideBarSubtitle}>按处理类型筛选</div>
        </div>
        <div className={styles.divider} />
        <ul className={styles.sideBarList}>
          {PROCESS_TYPES.map((type) => {
            const isOpen = expandedTypes.has(type)
            const isSelected = type === selectedType
            return (
              <li key={type}>
                <div
                  className={`${styles.sideBarItem}${
                    isSelected ? ` ${styles.sideBarItemActive}` : ''
                  }`}
                >
                  <button
                    type="button"
                    className={styles.sideBarChevron}
                    onClick={() => toggleType(type)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? `收起${type}` : `展开${type}`}
                  >
                    <span
                      className={`${styles.sideBarChevronIcon}${
                        isOpen ? ` ${styles.sideBarChevronOpen}` : ''
                      }`}
                      aria-hidden="true"
                    >
                      &gt;
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.sideBarItemLabel}
                    onClick={() => setSelectedType(type)}
                    aria-pressed={isSelected}
                  >
                    {type}
                  </button>
                </div>
                {isOpen && <div className={styles.sideBarItemContent} />}
              </li>
            )
          })}
        </ul>
      </div>
      <div className={styles.content}>
        <div className={styles.eyebrow}>DATA PROCESSING</div>
        <h1>数据处理</h1>
        <p>对地理空间数据执行清洗、转换与分析。</p>
        <div className={styles.placeholder}>
          <span className={styles.icon}>▦</span>
          <h2>暂无处理任务</h2>
          <p>创建处理流程后，将在此处查看任务进度与结果。</p>
        </div>
      </div>
    </section>
  )
}
