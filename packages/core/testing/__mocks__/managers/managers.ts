import {
  AuthenticatedUser,
  IAuthentication,
  IBackupManager,
  IAccessTokenBackupProvider,
  IStorageManager,
  IWalletManager,
} from '../../../src'
import { IEncryptionManager } from '../../../src/shared/interfaces/IEncryption'

export const authenticationManager: IAuthentication & {
  getAccessToken: jest.Mock<Promise<string>, [string?]>
  signInSilently: jest.Mock<Promise<AuthenticatedUser>, []>
} = {
  provider: 'google',
  signIn: jest.fn(async (): Promise<AuthenticatedUser> => {
    return {
      provider: 'google',
      providerUserId: 'mock-user-id',
      email: 'mock@example.com',
      displayName: 'Mock User',
      photoUri: null,
      credentials: {
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        serverAuthCode: undefined,
      },
    }
  }),
  signOut: jest.fn(async (): Promise<void> => {
    return Promise.resolve()
  }),
  getAccessToken: jest.fn(async () => 'mock-access-token'),
  signInSilently: jest.fn(async (): Promise<AuthenticatedUser> => {
    return {
      provider: 'google',
      providerUserId: 'mock-user-id',
      email: 'mock@example.com',
      displayName: 'Mock User',
      photoUri: null,
      credentials: {
        accessToken: 'mock-access-token',
        idToken: 'mock-id-token',
        serverAuthCode: undefined,
      },
    }
  }),
}

export const backupManager: IBackupManager = {
  registerProvider: jest.fn(),
  getProvider: jest.fn(),
  listAvailable: jest.fn(),
  hasBackup: jest.fn(),
  saveToTargets: jest.fn(),
  retrieveFrom: jest.fn(),
  deleteFrom: jest.fn(),
}

export const accessTokenBackupProvider: IAccessTokenBackupProvider = {
  provider: 'google',
  isAvailable: jest.fn(async () => true),
  hasBackup: jest.fn(async () => true),
  save: jest.fn(async () => undefined),
  retrieve: jest.fn(),
  delete: jest.fn(async () => undefined),
  getAccessToken: jest.fn(() => 'mock-access-token'),
  setAccessToken: jest.fn(),
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
