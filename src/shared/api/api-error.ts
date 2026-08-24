export class ApiError extends Error {
  readonly status?: number
  readonly code?: number
  readonly isUnauthorized: boolean

  constructor(opts: {
    message: string
    status?: number
    code?: number
    isUnauthorized?: boolean
  }) {
    super(opts.message)
    this.name = 'ApiError'
    this.status = opts.status
    this.code = opts.code
    this.isUnauthorized = opts.isUnauthorized ?? opts.status === 401
  }
}
