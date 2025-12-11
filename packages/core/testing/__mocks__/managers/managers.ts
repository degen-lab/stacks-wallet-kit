import {
  IAuthentication,
  IBackupManager,
  IStorageManager,
  IWalletManager,
  User,
} from '../../../src'
import { IEncryptionManager } from '../../../src/shared/interfaces/IEncryption'

export const authenticationManager: IAuthentication = {
  signIn: jest.fn(
    async (): Promise<{ accessToken: string; user: User | undefined }> => {
      return {
        accessToken: 'mock-access-token',
        user: {
          user: {
            id: 'mock-user-id',
            email: 'mock@example.com',
            name: 'Mock User',
            photo: null,
            familyName: null,
            givenName: null,
          },
          scopes: [],
          idToken: null,
          serverAuthCode: null,
        },
      }
    }
  ),
  signOut: jest.fn(async (): Promise<void> => {
    return Promise.resolve()
  }),
  getAccessToken: jest.fn(),
  signInSilently: jest.fn(
    async (): Promise<{ accessToken: string; user: User | undefined }> => {
      return {
        accessToken: 'mock-access-token',
        user: {
          user: {
            id: 'mock-user-id',
            email: 'mock@example.com',
            name: 'Mock User',
            photo: null,
            familyName: null,
            givenName: null,
          },
          scopes: [],
          idToken: null,
          serverAuthCode: null,
        },
      }
    }
  ),
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
