/** 登录请求体（匹配后端 /api/auth/login 契约） */
export interface LoginRequest {
  readonly username: string
  readonly password: string
  readonly platform: string
  readonly deviceId: string
  readonly browser: string
  readonly os: string
  readonly userAgent: string
  // 强制登录：true 时后端挤掉该账号在其他设备的会话。确认启用后取消注释
  readonly forceLogin: boolean
}

/** 登录响应 data 字段 */
export interface LoginResponseData {
  readonly token: string
  readonly username: string
  readonly role?: string
  readonly roleType?: string
  readonly platform?: string
}

/** 登录响应体（后端统一包装：code/message/data） */
export interface LoginResponse {
  readonly code: number
  readonly message?: string
  readonly data?: LoginResponseData
}

/** 页面表单只需账号密码 */
export interface LoginCredentials {
  readonly username: string
  readonly password: string
  // 强制登录：确认启用后取消注释
  readonly forceLogin: boolean
}

/** 本地存储的会话（只有 token，存 sessionStorage） */
export interface AuthSession {
  readonly token: string
  readonly username: string
}
