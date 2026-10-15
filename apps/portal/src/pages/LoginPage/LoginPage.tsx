import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Brand, isSessionExpiredRedirect } from '@ocean-cloud/ui'
import styles from './LoginPage.module.css'
import { Toast } from './Toast'
import type { ToastData } from './Toast'
import {
  login,
  navigateAfterLogin,
} from '../../features/auth/services/authService'
import { LOGIN_PATH } from '../../features/auth/constants'
import eyeIcon from './assets/eye.svg'

export function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  // 强制登录：勾选后挤掉该账号在其他设备的会话。确认启用后取消注释
  const [forceLogin, setForceLogin] = useState(false)
  const [loading, setLoading] = useState(false)
  // 会话过期跳回来时（地址带 ?reason=session-expired）直接给出提示：
  // 在初始化 state 时派生，避免在 effect 里 setState 引发级联渲染
  const [toast, setToast] = useState<ToastData | null>(() =>
    isSessionExpiredRedirect(window.location.hash)
      ? {
          id: Date.now(),
          type: 'warning',
          text: '太久没操作，登录已过期，请重新登录',
        }
      : null,
  )

  // 标记只提示一次：清掉 hash 上的查询串，用户刷新登录页时不再重复弹出
  useEffect(() => {
    if (isSessionExpiredRedirect(window.location.hash)) {
      window.history.replaceState(null, '', `#${LOGIN_PATH}`)
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    try {
      // 强制登录启用后改用下面这行
      await login({ username, password, forceLogin })
      setToast({ id: Date.now(), type: 'success', text: '登录成功' })
      navigateAfterLogin()
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '登录失败，请检查网络连接'
      setToast({ id: Date.now(), type: 'error', text: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <div className={styles.loginPageLeft}>
        <Brand />
        <div className={styles.loginPageIntro}>
          <div style={{ marginBottom: '20px' }}>
            <span
              style={{
                fontFamily: 'Noto Sans',
                fontWeight: 500,
                fontStyle: 'Medium',
                fontSize: '38px',
              }}
            >
              海洋数据，一站管理
            </span>
          </div>
          <div>
            <span
              style={{
                fontFamily: 'Noto Sans',
                fontWeight: 500,
                fontStyle: 'Medium',
                fontSize: '16px',
              }}
            >
              连接数据管理、切片处理与服务发布
            </span>
          </div>
          <div>
            <span
              style={{
                fontFamily: 'Noto Sans',
                fontWeight: 500,
                fontStyle: 'Medium',
                fontSize: '16px',
              }}
            >
              让每一份海洋数据从存储走向应用
            </span>
          </div>
        </div>
        <div className={styles.loginPageTakeSpace}></div>
        <div className={styles.loginPageShow}>
          <span
            style={{
              fontFamily: 'Noto Sans',
              fontWeight: 500,
              fontStyle: 'Medium',
              fontSize: '13px',
            }}
          >
            数据管理 / 数据处理 / 结果发布 / 可视化应用
          </span>
        </div>
      </div>

      <div className={styles.loginPageRight}>
        <div className={styles.loginForm}>
          <div>
            <h2
              style={{
                margin: 0,
                fontFamily: 'Noto Sans',
                fontWeight: 700,
                fontSize: '30px',
                color: '#173042',
              }}
            >
              登录云海
            </h2>
            <p
              style={{
                margin: '20px 0 0',
                fontFamily: 'Noto Sans',
                fontWeight: 500,
                fontSize: '14px',
                color: '#3F5665',
              }}
            >
              欢迎回来，请使用平台账号登录
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              marginTop: '32px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'Noto Sans',
                  fontWeight: 500,
                  fontSize: '13px',
                  color: '#13293d',
                  marginBottom: '8px',
                }}
              >
                账号
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入账号"
                autoComplete="username"
                disabled={loading}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  border: '1px solid #d5e0e9',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'Noto Sans',
                  fontWeight: 500,
                  fontSize: '14px',
                  color: '#173042',
                  marginBottom: '8px',
                }}
              >
                密码
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '40px',
                    padding: '0 40px 0 12px',
                    border: '1px solid #d5e0e9',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <img
                  src={eyeIcon}
                  alt={showPassword ? '隐藏密码' : '显示密码'}
                  role="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 400,
                  fontSize: '13px',
                  color: '#576e85',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  style={{
                    borderRadius: '4px',
                    border: '1px solid #C6D4D9',
                    width: '16px',
                    height: '16px',
                    accentColor: '#1267d6',
                  }}
                />
                记住账号
              </label>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontFamily: 'Noto Sans',
                  fontWeight: 400,
                  fontSize: '13px',
                  color: '#576e85',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={forceLogin}
                  onChange={(e) => setForceLogin(e.target.checked)}
                  style={{
                    borderRadius: '4px',
                    border: '1px solid #C6D4D9',
                    width: '16px',
                    height: '16px',
                    accentColor: '#1267d6',
                  }}
                />
                强制登录
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                height: '40px',
                border: 'none',
                borderRadius: '6px',
                background: '#1267D6',
                color: '#fff',
                fontSize: '16px',
                fontStyle: 'Medium',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? '登录中…' : '登录'}
            </button>
          </form>

          <p
            style={{
              textAlign: 'center',
              fontFamily: 'Noto Sans',
              fontWeight: 500,
              fontSize: '13px',
              color: '#3F5665',
            }}
          >
            忘记密码？请联系管理员
          </p>
        </div>

        <footer className={styles.footer}>
          © {new Date().getFullYear()} Ocean Cloud · 云海平台
          <span>连接海洋，探索无限。</span>
        </footer>
      </div>
    </div>
  )
}
