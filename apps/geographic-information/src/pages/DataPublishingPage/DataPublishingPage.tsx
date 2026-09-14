import { useState } from 'react'
import styles from './DataPublishingPage.module.css'

const SERVICE_TYPES = [
  '全部服务',
  '影像服务',
  '矢量服务',
  '电子海图服务',
  '地形服务',
  '倾斜摄影服务',
] as const

export function DataPublishingPage() {
  const [selectedType, setSelectedType] = useState<string>(SERVICE_TYPES[0])
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
          <div className={styles.sideBarTitle}>全部服务</div>
          <div className={styles.sideBarSubtitle}>按服务类型筛选</div>
        </div>
        <div className={styles.divider} />
        <ul className={styles.sideBarList}>
          {SERVICE_TYPES.map((type) => {
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
        <div className={styles.eyebrow}>DATA PUBLISHING</div>
        <h1>数据发布</h1>
        <p>将处理后的数据集发布为可访问的服务与产品。</p>
        <div className={styles.placeholder}>
          <span className={styles.icon}>▦</span>
          <h2>暂无发布记录</h2>
          <p>发布数据服务后，将在此处查看已发布条目与状态。</p>
        </div>
      </div>
    </section>
  )
}
