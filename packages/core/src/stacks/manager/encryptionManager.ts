import { Wallet, WalletEnvelope } from '../../shared/types/backupTypes'
import { IEncryptionManager } from '../../shared/interfaces/IEncryption'
import {
  EncryptionError,
  InvalidEncryptedWalletError,
  InvalidMnemonicError,
  InvalidPasswordError,
  InvalidPasswordOrSaltOrEncryptedWalletError,
} from '../../shared/errors/encryptionErrors'
import {
  decryptEnvelopeData,
  decryptMnemonic,
  encryptEnvelopeData,
} from '../utils/encryptionHelpers'

export class EncryptionManager implements IEncryptionManager {
  constructor() {}

  async encryptWallet(
    password: string,
    wallet: Wallet,
    mnemonic: string
  ): Promise<{
    encryptedWallet: string
    encryptedMnemonic: string
    mnemonicNonce: string
    walletNonce: string
    wrappedMasterKey: string
    wrapNonce: string
    iterations: number
    salt: string
  }> {
    try {
      if (password.trim() === '') {
        throw new InvalidPasswordError()
      }
      const {
        encryptedMnemonic,
        encryptedWallet,
        salt,
        walletNonce,
        mnemonicNonce,
        wrappedMasterKey,
        wrapNonce,
        iterations,
      } = await encryptEnvelopeData(mnemonic, wallet, password)
      return {
        encryptedMnemonic,
        encryptedWallet,
        salt,
        walletNonce,
        mnemonicNonce,
        wrappedMasterKey,
        wrapNonce,
        iterations,
      }
    } catch (error) {
      this.handleEncryptionError(error)
    }
  }

  async decryptMnemonic(
    password: string,
    salt: string,
    wrapNonce: string,
    wrappedMasterKey: string,
    mnemonicNonce: string,
    encryptedMnemonic: string
  ): Promise<string> {
    try {
      if (password.trim() === '') {
        throw new InvalidPasswordError()
      }
      return decryptMnemonic(
        salt,
        wrapNonce,
        wrappedMasterKey,
        mnemonicNonce,
        encryptedMnemonic,
        password
      )
    } catch (error) {
      this.handleEncryptionError(error)
    }
  }

  async decryptWallet(
    password: string,
    envelope: WalletEnvelope
  ): Promise<{ wallet: Wallet; mnemonic: string }> {
    try {
      if (password.trim() === '') {
        throw new InvalidPasswordError()
      }
      const decryptedData = await decryptEnvelopeData(envelope, password)
      return decryptedData
    } catch (error) {
      this.handleEncryptionError(error)
    }
  }

  private handleEncryptionError(error: unknown): never {
    if (error instanceof Error) {
      if (error.message.includes('mnemonic')) {
        throw new InvalidMnemonicError()
      }
      if (error.message.includes('Invalid password')) {
        throw new InvalidPasswordError()
      }
      if (
        error.message.includes('failure in MAC check') ||
        error.message.includes('invalid tag')
      ) {
        throw new InvalidPasswordOrSaltOrEncryptedWalletError()
      }
      if (error.message.includes('Failed to parse encrypted content JSON')) {
        throw new InvalidEncryptedWalletError()
      }
      throw new EncryptionError(error.message, 'UNKNOWN_ERROR', error)
    } else if (error instanceof DOMException) {
      const cause = (error as { cause?: unknown }).cause

      const causeMessage = (cause as { message?: string })?.message ?? ''

      if (causeMessage.includes('bad decrypt')) {
        throw new InvalidPasswordError()
      }
      if (causeMessage.includes('wrong final block length')) {
        throw new InvalidMnemonicError()
      }
      throw new EncryptionError(error.message, 'UNKNOWN_ERROR', error)
    }
    throw new EncryptionError(
      'An unknown error occurred',
      'UNKNOWN_ERROR',
      error
    )
  }
}
