import type { AuthProvider } from '../types/authTypes'

export class BackupError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'BackupError'
    Object.setPrototypeOf(this, BackupError.prototype)
  }
}

export class BackupProviderNotRegisteredError extends BackupError {
  constructor(
    message = 'Backup provider is not registered',
    code = 'BACKUP_PROVIDER_NOT_REGISTERED'
  ) {
    super(message, code)
    this.name = 'BackupProviderNotRegisteredError'
    Object.setPrototypeOf(this, BackupProviderNotRegisteredError.prototype)
  }
}

export class BackupNotFoundError extends BackupError {
  constructor(message = 'Backup not found', code = 'BACKUP_NOT_FOUND') {
    super(message, code)
    this.name = 'BackupNotFoundError'
    Object.setPrototypeOf(this, BackupNotFoundError.prototype)
  }
}

export class BackupAlreadyExistsError extends BackupError {
  constructor(
    message = 'Backup already exists',
    code = 'BACKUP_ALREADY_EXISTS'
  ) {
    super(message, code)
    this.name = 'BackupAlreadyExistsError'
    Object.setPrototypeOf(this, BackupAlreadyExistsError.prototype)
  }
}

export class GoogleApiError extends BackupError {
  constructor(message = 'Google API error', code = 'GOOGLE_API_ERROR') {
    super(message, code)
    this.name = 'GoogleApiError'
    Object.setPrototypeOf(this, GoogleApiError.prototype)
  }
}

export class AccessTokenError extends BackupError {
  constructor(message = 'Access token error', code = 'ACCESS_TOKEN_ERROR') {
    super(message, code)
    this.name = 'AccessTokenError'
    Object.setPrototypeOf(this, AccessTokenError.prototype)
  }
}

export class CloudKitUnavailableError extends BackupError {
  constructor(
    message = 'CloudKit is unavailable on this device',
    code = 'CLOUDKIT_UNAVAILABLE',
    originalError?: unknown
  ) {
    super(message, code, originalError)
    this.name = 'CloudKitUnavailableError'
    Object.setPrototypeOf(this, CloudKitUnavailableError.prototype)
  }
}

export class MultipleBackupsFoundError extends BackupError {
  constructor(
    message = 'Multiple backups found — specify a walletId to retrieve a specific one',
    code = 'MULTIPLE_BACKUPS_FOUND'
  ) {
    super(message, code)
    this.name = 'MultipleBackupsFoundError'
    Object.setPrototypeOf(this, MultipleBackupsFoundError.prototype)
  }
}

export class BackupWriteFailedError extends BackupError {
  constructor(
    public failures: Array<{ provider: AuthProvider; error: unknown }>,
    message = 'Failed to write wallet backup to all selected providers',
    code = 'BACKUP_WRITE_FAILED'
  ) {
    super(message, code, failures)
    this.name = 'BackupWriteFailedError'
    Object.setPrototypeOf(this, BackupWriteFailedError.prototype)
  }
}
