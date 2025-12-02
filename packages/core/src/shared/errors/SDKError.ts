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
