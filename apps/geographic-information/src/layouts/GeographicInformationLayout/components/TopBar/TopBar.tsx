import { useState } from 'react'
import styles from './TopBar.module.css'
interface TopBarProps {
  readonly pageTitle: string
}
export function TopBar({ pageTitle }: TopBarProps) {
  const [isDark, setIsDark] = useState(false)
  const currentUser = (() => {
    try {
      const raw = localStorage.getItem('username')
      return raw ?? ''
    } catch {
      return ''
    }
  })()
  function handleLogout() {
    try {
      localStorage.removeItem('username')
      localStorage.removeItem('token')
    } catch {
      // 忽略存储异常
    }
    location.hash = '#/login'
  }
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.headerTitle}>{pageTitle}</div>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.headerSearch}>
          <span className={styles.headerSearchIcon}>🔍</span>
          <input
            type="text"
            placeholder="搜索数据、任务或服务"
            className={styles.headerSearchInput}
          />
        </div>
        <button
          type="button"
          className={styles.headerSchema}
          onClick={() => setIsDark((v) => !v)}
          title={isDark ? '切换到浅色模式' : '切换到深色模式'}
        >
          <span className={styles.headerSchemaIcon}>
            {isDark ? '☀️' : '🌙'}
          </span>
        </button>
        <div
          className={styles.headerNotification}
          title="通知"
        >
          <span className={styles.headerNotificationIcon}>🔔</span>
        </div>
        <button
          type="button"
          className={styles.headerUser}
          onClick={handleLogout}
          title="退出登录"
        >
          {currentUser || '用户'}
        </button>
      </div>
    </header>
  )
}
