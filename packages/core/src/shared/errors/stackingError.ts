export class StackingError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'StackingError'
    Object.setPrototypeOf(this, StackingError.prototype)
  }
}

export class MinimumThresholdNotMetError extends StackingError {
  constructor(
    message = 'Error: Minimum threshold not met',
    public code = 'MINIMUM_THRESHOLD_NOT_MET'
  ) {
    super(message, code)
    this.name = 'MinimumThresholdNotMetError'
    Object.setPrototypeOf(this, MinimumThresholdNotMetError.prototype)
  }
}

export class InvalidLockPeriod extends StackingError {
  constructor(
    message = 'Error: Invalid lock period',
    public code = 'INVALID_LOCK_PERIOD'
  ) {
    super(message, code)
    this.name = 'InvalidLockPeriod'
    Object.setPrototypeOf(this, InvalidLockPeriod.prototype)
  }
}

export class InvalidAmountError extends StackingError {
  constructor(
    message = 'Error: Amount should be smaller than total account balance',
    public code = 'INVALID_AMOUNT_ERROR'
  ) {
    super(message, code)
    this.name = 'InvalidAmountError'
    Object.setPrototypeOf(this, InvalidAmountError.prototype)
  }
}

export class MaxAmountSmallerThanAmountError extends StackingError {
  constructor(
    message = 'Error: Max amount should be greater than amount',
    public code = 'INVALID_MAX_AMOUNT_ERROR'
  ) {
    super(message, code)
    this.name = 'MaxAmountSmallerThanAmountError'
    Object.setPrototypeOf(this, MaxAmountSmallerThanAmountError.prototype)
  }
}

export class MaxAmountGreaterThanBalanceError extends StackingError {
  constructor(
    message = 'Error: Max amount should be smaller than account balance',
    public code = 'INVALID_MAX_AMOUNT_ERROR'
  ) {
    super(message, code)
    this.name = 'MaxAmountGreaterThanBalanceError'
    Object.setPrototypeOf(this, MaxAmountGreaterThanBalanceError.prototype)
  }
}

export class SigningError extends StackingError {
  constructor(
    message = 'Error: Failed to sign transaction',
    public code = 'SIGNING_ERROR'
  ) {
    super(message, code)
    this.name = 'SigningError'
    Object.setPrototypeOf(this, SigningError.prototype)
  }
}
