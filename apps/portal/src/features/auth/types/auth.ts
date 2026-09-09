/** 登录请求体，字段以后端 /auth/login 契约为准 */
export interface LoginCredentials {
  readonly username: string
  readonly password: string
}

/** 登录响应，按后端实际返回结构调整 */
export interface AuthSession {
  readonly token: string
  readonly username: string
}
