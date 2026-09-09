import { useState } from 'react'
import styles from './TopBar.module.css'
import searchIconUrl from './assets/Search.svg'
import sunIconUrl from './assets/Sun.svg'
import moonIconUrl from './assets/Moon.svg'
import notificationIconUrl from './assets/Notification.svg'
interface TopBarProps {
  readonly pageTitle: string
  /** 不传则回退读取 localStorage 的 username */
  readonly userName?: string
  /** 不传则按默认行为清除本地登录信息并跳转 #/login */
  readonly onLogout?: () => void
}
function readStoredUserName() {
  try {
    return localStorage.getItem('username') ?? ''
  } catch {
    return ''
  }
}
function defaultLogout() {
  try {
    localStorage.removeItem('username')
    localStorage.removeItem('token')
  } catch {
    // 忽略存储异常
  }
  location.hash = '#/login'
}
export function TopBar({ pageTitle, userName, onLogout }: TopBarProps) {
  const [isDark, setIsDark] = useState(false)
  const currentUser = userName ?? readStoredUserName()
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <div className={styles.headerTitle}>{pageTitle}</div>
      </div>
      <div className={styles.headerRight}>
        <div className={styles.headerSearch}>
          <img
            src={searchIconUrl}
            alt="search"
            className={styles.headerSearchIcon}
          />
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
            src={isDark ? sunIconUrl : moonIconUrl}
            alt={isDark ? 'sun' : 'moon'}
            className={styles.headerSchemaIcon}
          />
        </button>
        <div className={styles.headerNotification}>
          <img
            src={notificationIconUrl}
            alt="notification"
            className={styles.headerNotificationIcon}
          />
        </div>
        <button
          type="button"
          className={styles.headerUser}
          onClick={() => (onLogout ? onLogout() : defaultLogout())}
          title="退出登录"
        >
          {currentUser || '用户'}
        </button>
      </div>
    </header>
  )
}
