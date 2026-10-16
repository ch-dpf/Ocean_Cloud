import { useState } from 'react'
import styles from './TopBar.module.css'
import searchIconUrl from './assets/Search.svg'
import sunIconUrl from './assets/Sun.svg'
import moonIconUrl from './assets/Moon.svg'
import notificationIconUrl from './assets/Notification.svg'
import { UserDetailDialog } from './UserDetailDialog'
import type { CurrentUser } from '../../hooks/useCurrentUser'
interface TopBarProps {
  readonly pageTitle: string
  readonly onLogout?: () => void
  /** 当前登录用户；为 null 或未传时头像展示默认图 */
  readonly user?: CurrentUser | null
}
export function TopBar({ pageTitle, onLogout, user }: TopBarProps) {
  const [isDark, setIsDark] = useState(false)
  // 鼠标悬浮展开的账号菜单
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  function handleLogout() {
    if (onLogout) {
      onLogout()
      return
    }
    try {
      sessionStorage.removeItem('username')
      sessionStorage.removeItem('token')
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
        {/* 头像 + 悬浮菜单：外层负责把 hover 区域从头像延伸到菜单，避免中途收起 */}
        <div
          className={styles.headerUser}
          onMouseEnter={() => setIsMenuOpen(true)}
          onMouseLeave={() => setIsMenuOpen(false)}
        >
          <button
            type="button"
            className={styles.avatar}
            aria-haspopup="menu"
            aria-expanded={isMenuOpen}
            aria-label="账号菜单"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt="" className={styles.avatarImage} />
            ) : (
              // 头像为空时用默认头像
              <span className={styles.avatarFallback} aria-hidden="true">
                🧑
              </span>
            )}
          </button>
          {isMenuOpen && (
            <div className={styles.userMenu}>
              <div className={styles.userMenuList} role="menu">
                <button
                  type="button"
                  role="menuitem"
                  className={styles.userMenuItem}
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsDetailOpen(true)
                  }}
                >
                  用户详情
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.userMenuItem}
                  onClick={() => {
                    setIsMenuOpen(false)
                    handleLogout()
                  }}
                >
                  退出登录
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {isDetailOpen && (
        <UserDetailDialog
          user={user ?? null}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </header>
  )
}
