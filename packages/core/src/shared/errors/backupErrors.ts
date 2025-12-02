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
