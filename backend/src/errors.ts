import type { ApiErrorCode } from '@shared/api-contract'

/** An error whose code and message are safe to return to the client. */
export class AppError extends Error {
  readonly code: ApiErrorCode
  constructor(code: ApiErrorCode, message: string) {
    super(message)
    this.name = 'AppError'
    this.code = code
  }
}

export const badRequest = (message: string) => new AppError('BAD_REQUEST', message)
export const forbidden = (message = 'Anda tidak mempunyai kebenaran untuk tindakan ini.') => new AppError('FORBIDDEN', message)
export const notFound = (message = 'Rekod tidak ditemui.') => new AppError('NOT_FOUND', message)
export const conflict = (message: string) => new AppError('CONFLICT', message)
export const unauthenticated = (message = 'Sila log masuk.') => new AppError('UNAUTHENTICATED', message)
