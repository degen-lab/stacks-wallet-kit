import {
  IAuthentication,
  IBackupManager,
  IStorageManager,
  IWalletManager,
} from '../../../src'
import { IEncryptionManager } from '../../../src/shared/interfaces/IEncryption'

export const authenticationManager: IAuthentication = {
  signIn: jest.fn(async (): Promise<string> => {
    return 'mock-access-token'
  }),
  signOut: jest.fn(async (): Promise<void> => {
    return Promise.resolve()
  }),
  getAccessToken: jest.fn(),
  signInSilently: jest.fn(),
}

export const backupManager: IBackupManager = {
  saveBackup: jest.fn(),
  deleteBackup: jest.fn(),
  deleteExistingBackup: jest.fn(),
  hasWalletBackup: jest.fn(),
  getBackup: jest.fn(),
  retrieveBackup: jest.fn(),
  updateAccessToken: jest.fn(),
  getAccessTokenFromClient: jest.fn(),
}

export const encryptionManager: IEncryptionManager = {
  encryptWallet: jest.fn(),
  decryptMnemonic: jest.fn(),
  decryptWallet: jest.fn(),
}

export const walletManager: IWalletManager = {
  createWallet: jest.fn(),
  createAccount: jest.fn(),
  createExistingWallet: jest.fn(),
}

export const storageManager: IStorageManager = {
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
