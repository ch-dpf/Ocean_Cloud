import type { AxiosRequestConfig } from 'axios'
import type { RequestError } from './RequestError.ts'
export type RequestErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'validation'
  | 'conflict'
  | 'rate-limit'
  | 'server'
  | 'http'
  | 'network'
  | 'timeout'
  | 'canceled'
  | 'business'
  | 'unknown'
export interface RequestOptions extends Omit<
  AxiosRequestConfig,
  'url' | 'method' | 'data' | 'validateStatus'
> {
  readonly silentError?: boolean
}
export type RequestErrorHandler = (error: RequestError) => void
export interface BusinessError {
  readonly code: string | number
  readonly message: string
}
export interface HttpClientOptions {
  readonly baseURL?: string
  readonly timeout?: number
  readonly getAccessToken?: () => string | null | undefined
  readonly parseBusinessError?: (data: unknown) => BusinessError | null
}
