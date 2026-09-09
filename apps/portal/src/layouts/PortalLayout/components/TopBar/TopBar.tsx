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
          <img src="/icons/Search.svg" alt="search" className={styles.headerSearchIcon} />
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
          <img
            src={isDark ? '/icons/Sun.svg' : '/icons/Moon.svg'}
            alt={isDark ? 'sun' : 'moon'}
            className={styles.headerSchemaIcon}
          />
        </button>
        <div className={styles.headerNotification}>
          <img
            src="/icons/Notification.svg"
            alt="notification"
            className={styles.headerNotificationIcon}
          />
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
