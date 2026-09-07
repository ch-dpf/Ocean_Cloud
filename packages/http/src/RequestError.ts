import type { RequestErrorKind } from './types.ts'
export class RequestError extends Error {
  readonly kind: RequestErrorKind
  readonly status?: number
  readonly businessCode?: string | number
  constructor(
    message: string,
    kind: RequestErrorKind,
    options: {
      status?: number
      businessCode?: string | number
      cause?: unknown
    } = {},
  ) {
    super(message, { cause: options.cause })
    this.name = 'RequestError'
    this.kind = kind
    this.status = options.status
    this.businessCode = options.businessCode
  }
}
