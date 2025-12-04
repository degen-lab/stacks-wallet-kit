export class SDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'SDKError'
    Object.setPrototypeOf(this, SDKError.prototype)
  }
}

export class LoginWithGoogleError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'LoginError'
    Object.setPrototypeOf(this, LoginWithGoogleError.prototype)
  }
}

export class WalletNotStoredError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'WalletNotStoredError'
    Object.setPrototypeOf(this, WalletNotStoredError.prototype)
  }
}

export class PasswordNotSetError extends SDKError {
  constructor(
    message = 'Password not set',
    public code = 'PASSWORD_NOT_SET',
    public originalError?: unknown
  ) {
    super(message, code, originalError)
    this.name = 'PasswordNotSetError'
    Object.setPrototypeOf(this, PasswordNotSetError.prototype)
  }
}
