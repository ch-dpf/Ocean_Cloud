import { httpClient } from '../../services/httpClient'
import { PORTAL_ORIGIN } from '../../config/application'

/** 退出登录：通知后端使 token 失效，清理本地会话并跳回主平台登录页 */
export async function logout(): Promise<void> {
  try {
    const token = sessionStorage.getItem('token')
    await httpClient.post('/auth/logout', { token })
  } catch {
    // 后端登出失败也继续本地清理
  } finally {
    try {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('username')
    } catch {
      // 忽略存储异常
    }
    window.location.href = `${PORTAL_ORIGIN.replace(/\/$/, '')}/#/login`
  }
}
