export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'AuthenticationError'
    Object.setPrototypeOf(this, AuthError.prototype)
  }
}

export class AuthProviderNotRegisteredError extends AuthError {
  constructor(
    message = 'Authentication provider is not registered',
    code = 'AUTH_PROVIDER_NOT_REGISTERED'
  ) {
    super(message, code)
    this.name = 'AuthProviderNotRegisteredError'
    Object.setPrototypeOf(this, AuthProviderNotRegisteredError.prototype)
  }
}

export class AuthenticationCancelledError extends AuthError {
  constructor(message = 'User cancelled the sign-in') {
    super(message, 'AUTHENTICATION_CANCELLED')
    this.name = 'AuthenticationCancelledError'
    Object.setPrototypeOf(this, AuthenticationCancelledError.prototype)
  }
}

export class AppleAuthError extends AuthError {
  constructor(
    message = 'Apple sign-in failed',
    code = 'APPLE_AUTH_ERROR',
    originalError?: unknown
  ) {
    super(message, code, originalError)
    this.name = 'AppleAuthError'
    Object.setPrototypeOf(this, AppleAuthError.prototype)
  }
}

export class AuthenticationAlreadyInProgressError extends AuthError {
  constructor(message = 'Authentication Already in progress') {
    super(message, 'AUTHENTICATION_IN_PROGRESS')
    this.name = 'AuthenticationInProgressError'
    Object.setPrototypeOf(this, AuthenticationAlreadyInProgressError.prototype)
  }
}

export class PlayServicesNotAvailableError extends AuthError {
  constructor(message = 'Play Services not available or outdated') {
    super(message, 'PLAY_SERVICES_NOT_AVAILABLE')
    this.name = 'PlayServicesNotAvailableError'
    Object.setPrototypeOf(this, PlayServicesNotAvailableError.prototype)
  }
}

export class SignOutError extends AuthError {
  constructor(error: unknown, message = 'Could not sign out from google') {
    super(message, 'SIGN_OUT_FAILED', error)
    this.name = 'SignOutFailedError'
    Object.setPrototypeOf(this, SignOutError.prototype)
  }
}

export class SignInRequiredError extends AuthError {
  constructor(message = 'Sign with google is required for this operation') {
    super(message, 'SIGN_IN_REQUIRED')
    this.name = 'SignInRequiredError'
    Object.setPrototypeOf(this, SignInRequiredError.prototype)
  }
}

export class TokenRefreshError extends AuthError {
  constructor(
    message = 'Could not refresh the access token',
    originalError?: unknown
  ) {
    super(message, 'TOKEN_REFRESH_ERROR', originalError)
    this.name = 'TokenRefreshError'
    Object.setPrototypeOf(this, TokenRefreshError.prototype)
  }
}
