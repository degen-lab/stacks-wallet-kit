export class EncryptionError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'EncryptionError'
    Object.setPrototypeOf(this, EncryptionError.prototype)
  }
}

export class InvalidMnemonicError extends EncryptionError {
  constructor(message = 'Invalid mnemonic', code = 'INVALID_MNEMONIC') {
    super(message, code)
    this.name = 'InvalidMnemonicError'
    Object.setPrototypeOf(this, InvalidMnemonicError.prototype)
  }
}

export class InvalidPasswordError extends EncryptionError {
  constructor(message = 'Invalid password', code = 'INVALID_PASSWORD') {
    super(message, code)
    this.name = 'InvalidPasswordError'
    Object.setPrototypeOf(this, InvalidPasswordError.prototype)
  }
}

export class InvalidEncryptedWalletError extends EncryptionError {
  constructor(
    message = 'Invalid encrypted wallet',
    code = 'INVALID_ENCRYPTED_WALLET'
  ) {
    super(message, code)
    this.name = 'InvalidEncryptedWalletError'
    Object.setPrototypeOf(this, InvalidEncryptedWalletError.prototype)
  }
}

export class InvalidPasswordOrSaltOrEncryptedWalletError extends EncryptionError {
  constructor(
    message = 'Invalid password, salt, or encrypted wallet',
    code = 'INVALID_PASSWORD_OR_SALT_OR_ENCRYPTED_WALLET'
  ) {
    super(message, code)
    this.name = 'InvalidPasswordOrSaltOrEncryptedWalletError'
    Object.setPrototypeOf(
      this,
      InvalidPasswordOrSaltOrEncryptedWalletError.prototype
    )
  }
}

export class PrivateKeyNotFoundError extends EncryptionError {
  constructor(
    message = 'Private key not found',
    code = 'PRIVATE_KEY_NOT_FOUND'
  ) {
    super(message, code)
    this.name = 'PrivateKeyNotFoundError'
    Object.setPrototypeOf(this, PrivateKeyNotFoundError.prototype)
  }
}
