import { AuthenticationCancelledError, AuthError, User } from '../../../src'
import { WalletNotStoredError } from '../../../src/shared/errors/SDKError'
import { NetworkType } from '../../../src/shared'
import { BaseClient } from '../../../src/sdk/baseClient'
import {
  authenticationManager,
  backupManager,
  encryptionManager,
  storageManager,
  walletManager,
} from '../../__mocks__/managers/managers'
import { stacksClient, stackingClient } from '../../__mocks__/clients'
import { StackingPool } from '../../../src/stacks/utils/types'
import {
  InvalidAmountError,
  InvalidLockPeriod,
  MaxAmountGreaterThanBalanceError,
  MaxAmountSmallerThanAmountError,
  MinimumThresholdNotMetError,
} from '../../../src/shared/errors/stackingError'
import {
  AccessTokenError,
  BackupAlreadyExistsError,
  BackupError,
  BackupNotFoundError,
} from '../../../src/shared/errors/backupErrors'
import { Wallet } from '../../../src/shared'
import {
  EncryptionError,
  InvalidMnemonicError,
  PrivateKeyNotFoundError,
} from '../../../src/shared/errors/encryptionErrors'
import {
  generateSecretKey,
  getFingerPrintFromMnemonic,
} from '../../../src/stacks/utils/walletHelpers'
import * as helpers from '../../../src/stacks/utils/walletHelpers'
import { HDKey } from '@scure/bip32'
import { ClarityValue } from '@stacks/transactions'

describe('BaseClient', () => {
  const baseClient = new BaseClient(
    authenticationManager,
    backupManager,
    walletManager,
    encryptionManager,
    storageManager,
    stacksClient,
    stackingClient
  )

  async function createMockWallet(): Promise<Wallet> {
    const mnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    const privateKey = await generateSecretKey(mnemonic, '')
    return {
      privateKey: privateKey.privateExtendedKey,
      createdAt: new Date().toString(),
      accounts: [],
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset mock implementations to prevent persistence across tests
    jest.spyOn(storageManager, 'getItem').mockReset()
    jest.spyOn(stacksClient, 'getPoxData').mockReset()
    jest.spyOn(stackingClient, 'revokeDelegation').mockReset()
    jest.spyOn(stackingClient, 'delegateStx').mockReset()
    jest.spyOn(stackingClient, 'stackStx').mockReset()
    jest.spyOn(stackingClient, 'stackExtend').mockReset()
    jest.spyOn(stackingClient, 'stackIncrease').mockReset()
    jest.spyOn(helpers, 'getBitcoinAddressesFromStacksWallet').mockReset()
  })

  describe('loginWithGoogle', () => {
    it('should login with google successfully', async () => {
      const mockUser: User = {
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
      }
      jest.spyOn(authenticationManager, 'signIn').mockResolvedValueOnce({
        accessToken: 'mock-access-token',
        user: mockUser,
      })
      jest.spyOn(backupManager, 'hasWalletBackup').mockResolvedValueOnce(true)
      const result = await baseClient.loginWithGoogle()
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        hasBackup: true,
        userData: mockUser,
      })
    })

    it('should throw an error if the authentication fails', async () => {
      const authError = new AuthenticationCancelledError()
      jest
        .spyOn(authenticationManager, 'signIn')
        .mockRejectedValueOnce(authError)

      await expect(baseClient.loginWithGoogle()).rejects.toThrow(
        AuthenticationCancelledError
      )
    })

    it('should throw an error if the backup fails', async () => {
      const mockUser: User = {
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
      }
      jest.spyOn(authenticationManager, 'signIn').mockResolvedValueOnce({
        accessToken: 'mock-access-token',
        user: mockUser,
      })
      jest
        .spyOn(backupManager, 'hasWalletBackup')
        .mockRejectedValueOnce(new BackupError('Backup failed', 'BACKUP_ERROR'))
      await expect(baseClient.loginWithGoogle()).rejects.toThrow(BackupError)
      expect(backupManager.hasWalletBackup).toHaveBeenCalled()
    })

    it('should throw an SDK error if an unknown error occurs', async () => {
      jest
        .spyOn(authenticationManager, 'signIn')
        .mockRejectedValueOnce(new Error('Unknown error'))
      await expect(baseClient.loginWithGoogle()).rejects.toThrow(
        'Unknown error'
      )
      expect(authenticationManager.signIn).toHaveBeenCalled()
    })
  })

  describe('createWallet', () => {
    it('should create a wallet successfully', async () => {
      const mockWallet = await createMockWallet()
      const mockMnemonic = 'test mnemonic phrase'

      jest
        .spyOn(walletManager, 'createWallet')
        .mockResolvedValueOnce({ wallet: mockWallet, mnemonic: mockMnemonic })
      jest.spyOn(storageManager, 'setItem').mockResolvedValue(undefined)

      const result = await baseClient.createWallet('mock-password')
      expect(result).toEqual(mockWallet)
      expect(walletManager.createWallet).toHaveBeenCalledWith('mock-password')
      expect(storageManager.setItem).toHaveBeenCalledWith('wallet', mockWallet)
      expect(storageManager.setItem).toHaveBeenCalledWith(
        'mnemonic',
        mockMnemonic
      )
    })
  })

  describe('storeExistingWallet', () => {
    const validMnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

    it('should store an existing wallet successfully', async () => {
      const mockWallet = await createMockWallet()

      jest
        .spyOn(walletManager, 'createExistingWallet')
        .mockResolvedValueOnce(mockWallet)
      jest.spyOn(storageManager, 'setItem').mockResolvedValue(undefined)

      const result = await baseClient.storeExistingWallet(
        validMnemonic,
        'mock-password'
      )

      expect(result).toEqual(mockWallet)
      expect(walletManager.createExistingWallet).toHaveBeenCalledWith(
        validMnemonic,
        'mock-password'
      )
      expect(storageManager.setItem).toHaveBeenCalledWith('wallet', mockWallet)
      expect(storageManager.setItem).toHaveBeenCalledWith(
        'mnemonic',
        validMnemonic
      )
    })

    it('should store wallet without password (undefined)', async () => {
      const mockWallet = await createMockWallet()

      jest
        .spyOn(walletManager, 'createExistingWallet')
        .mockResolvedValueOnce(mockWallet)
      jest.spyOn(storageManager, 'setItem').mockResolvedValue(undefined)

      const result = await baseClient.storeExistingWallet(validMnemonic)

      expect(result).toEqual(mockWallet)
      expect(walletManager.createExistingWallet).toHaveBeenCalledWith(
        validMnemonic,
        undefined
      )
      expect(storageManager.setItem).toHaveBeenCalledWith('wallet', mockWallet)
      expect(storageManager.setItem).toHaveBeenCalledWith(
        'mnemonic',
        validMnemonic
      )
    })

    it('should store wallet with passphrase', async () => {
      const mockWallet = await createMockWallet()
      const passphrase = 'test-passphrase'

      jest
        .spyOn(walletManager, 'createExistingWallet')
        .mockResolvedValueOnce(mockWallet)
      jest.spyOn(storageManager, 'setItem').mockResolvedValue(undefined)

      const result = await baseClient.storeExistingWallet(
        validMnemonic,
        passphrase
      )

      expect(result).toEqual(mockWallet)
      expect(walletManager.createExistingWallet).toHaveBeenCalledWith(
        validMnemonic,
        passphrase
      )
      expect(storageManager.setItem).toHaveBeenCalledWith('wallet', mockWallet)
      expect(storageManager.setItem).toHaveBeenCalledWith(
        'mnemonic',
        validMnemonic
      )
    })

    it('should throw InvalidMnemonicError for invalid mnemonic', async () => {
      const invalidMnemonic = 'invalid mnemonic phrase'

      await expect(
        baseClient.storeExistingWallet(invalidMnemonic, 'password')
      ).rejects.toThrow(InvalidMnemonicError)
      // Validation happens in facade before calling walletManager
      expect(walletManager.createExistingWallet).not.toHaveBeenCalled()
      expect(storageManager.setItem).not.toHaveBeenCalled()
    })

    it('should throw InvalidMnemonicError for empty mnemonic', async () => {
      await expect(
        baseClient.storeExistingWallet('', 'password')
      ).rejects.toThrow(InvalidMnemonicError)
      expect(walletManager.createExistingWallet).not.toHaveBeenCalled()
      expect(storageManager.setItem).not.toHaveBeenCalled()
    })

    it('should throw InvalidMnemonicError for mnemonic with wrong word count', async () => {
      const invalidMnemonic = 'abandon abandon abandon'

      await expect(
        baseClient.storeExistingWallet(invalidMnemonic, 'password')
      ).rejects.toThrow(InvalidMnemonicError)
      expect(walletManager.createExistingWallet).not.toHaveBeenCalled()
      expect(storageManager.setItem).not.toHaveBeenCalled()
    })

    it('should handle errors from walletManager gracefully', async () => {
      const error = new Error('Wallet creation failed')
      jest
        .spyOn(walletManager, 'createExistingWallet')
        .mockRejectedValueOnce(error)

      await expect(
        baseClient.storeExistingWallet(validMnemonic, 'password')
      ).rejects.toThrow()
      expect(walletManager.createExistingWallet).toHaveBeenCalled()
      expect(storageManager.setItem).not.toHaveBeenCalled()
    })

    it('should handle storage errors gracefully', async () => {
      const mockWallet = await createMockWallet()
      const storageError = new Error('Storage failed')

      jest
        .spyOn(walletManager, 'createExistingWallet')
        .mockResolvedValueOnce(mockWallet)
      jest.spyOn(storageManager, 'setItem').mockRejectedValueOnce(storageError)

      await expect(
        baseClient.storeExistingWallet(validMnemonic, 'password')
      ).rejects.toThrow()
      expect(walletManager.createExistingWallet).toHaveBeenCalled()
      expect(storageManager.setItem).toHaveBeenCalled()
    })

    it('should store wallet and mnemonic in correct order', async () => {
      const mockWallet = await createMockWallet()
      const setItemCalls: Array<[string, unknown]> = []

      jest
        .spyOn(walletManager, 'createExistingWallet')
        .mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(storageManager, 'setItem')
        .mockImplementation(async (key: string, value: unknown) => {
          setItemCalls.push([key, value])
          return Promise.resolve()
        })

      await baseClient.storeExistingWallet(validMnemonic, 'password')

      expect(setItemCalls).toHaveLength(2)
      expect(setItemCalls[0][0]).toBe('wallet')
      expect(setItemCalls[0][1]).toEqual(mockWallet)
      expect(setItemCalls[1][0]).toBe('mnemonic')
      expect(setItemCalls[1][1]).toBe(validMnemonic)
    })

    it('should create same wallet as createWallet when using same mnemonic and password', async () => {
      // Use real walletManager for this test to verify actual behavior
      const { WalletManager: RealWalletManager } = await import(
        '../../../src/stacks/manager/walletManager'
      )
      const realWalletManager = new RealWalletManager()

      // Create a wallet first
      const { wallet: createdWallet, mnemonic } =
        await realWalletManager.createWallet('test-password')

      // Create a new SDK facade with real walletManager
      const realBaseSDKFacade = new BaseClient(
        authenticationManager,
        backupManager,
        realWalletManager,
        encryptionManager,
        storageManager,
        stacksClient,
        stackingClient
      )

      jest.spyOn(storageManager, 'setItem').mockResolvedValue(undefined)

      const storedWallet = await realBaseSDKFacade.storeExistingWallet(
        mnemonic,
        'test-password'
      )

      expect(storedWallet.accounts[0].addresses.mainnet).toBe(
        createdWallet.accounts[0].addresses.mainnet
      )
      expect(storedWallet.accounts[0].addresses.testnet).toBe(
        createdWallet.accounts[0].addresses.testnet
      )
      expect(storedWallet.accounts[0].publicKey).toBe(
        createdWallet.accounts[0].publicKey
      )
    })
  })

  describe('backupWallet', () => {
    it('should backup a wallet successfully', async () => {
      const mockWallet = await createMockWallet()
      const mockMnemonic = 'test mnemonic phrase'
      const mockEncryptedData = {
        encryptedMnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        encryptedWallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        salt: 'test-salt',
        iterations: 1000,
        wrappedMasterKey: 'test-wrapped-master-key',
        wrapNonce: 'test-wrap-nonce',
      }
      const mockEnvelope = {
        version: 1 as const,
        walletId: 'test-fingerprint',
        createdAt: expect.any(Date),
        mnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        wallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        salt: 'test-salt',
        accountsCount: 0,
        protection: {
          kdf: {
            name: 'pbkdf2' as const,
            iterations: 1000,
            salt: 'test-salt',
          },
          wrappedMasterKey: 'test-wrapped-master-key',
          wrapNonce: 'test-wrap-nonce',
        },
      }
      jest
        .spyOn(storageManager, 'getItem')
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(encryptionManager, 'encryptWallet')
        .mockResolvedValueOnce(mockEncryptedData)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockResolvedValueOnce('test-fingerprint')
      jest.spyOn(backupManager, 'saveBackup').mockResolvedValueOnce(undefined)

      await baseClient.backupWallet('mock-password')

      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(storageManager.getItem).toHaveBeenCalledWith('mnemonic')
      expect(encryptionManager.encryptWallet).toHaveBeenCalledWith(
        'mock-password',
        mockWallet,
        mockMnemonic
      )
      expect(getFingerPrintFromMnemonic).toHaveBeenCalledWith(mockMnemonic)
      expect(backupManager.saveBackup).toHaveBeenCalledWith(
        'test-fingerprint',
        expect.objectContaining(mockEnvelope)
      )
    })
    it('should throw an error if the wallet is not found in storage', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)
      await expect(baseClient.backupWallet('mock-password')).rejects.toThrow(
        WalletNotStoredError
      )
    })

    it('should throw an error if the mnemonic is not found in storage', async () => {
      const mockEnvelope = {
        version: 1 as const,
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        wallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        salt: 'test-salt',
        accountsCount: 1,
        protection: {
          kdf: {
            name: 'pbkdf2' as const,
            iterations: 1000,
            salt: 'test-salt',
          },
          wrappedMasterKey: 'test-wrapped-master-key',
          wrapNonce: 'test-wrap-nonce',
        },
      }
      jest
        .spyOn(storageManager, 'getItem')
        .mockResolvedValueOnce(mockEnvelope)
        .mockResolvedValueOnce(null)
      const error = await baseClient
        .backupWallet('mock-password')
        .catch((e) => e)
      expect(error).toBeInstanceOf(WalletNotStoredError)
    })

    it('should throw a backup error if the backup fails', async () => {
      const mockWallet = await createMockWallet()
      const mockMnemonic = 'test mnemonic phrase'
      const mockEncryptedData = {
        encryptedMnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        encryptedWallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        salt: 'test-salt',
        iterations: 1000,
        wrappedMasterKey: 'test-wrapped-master-key',
        wrapNonce: 'test-wrap-nonce',
      }
      jest
        .spyOn(storageManager, 'getItem')
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(encryptionManager, 'encryptWallet')
        .mockResolvedValueOnce(mockEncryptedData)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockResolvedValueOnce('test-fingerprint')
      jest
        .spyOn(backupManager, 'saveBackup')
        .mockRejectedValueOnce(new BackupAlreadyExistsError())
      await expect(baseClient.backupWallet('test-password')).rejects.toThrow(
        BackupAlreadyExistsError
      )
    })

    it('should throw a SDK error if an unknown error occurs', async () => {
      const mockEnvelope = {
        version: 1 as const,
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        wallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        salt: 'test-salt',
        accountsCount: 1,
        protection: {
          kdf: {
            name: 'pbkdf2' as const,
            iterations: 1000,
            salt: 'test-salt',
          },
          wrappedMasterKey: 'test-wrapped-master-key',
          wrapNonce: 'test-wrap-nonce',
        },
      }
      const mockMnemonic = 'test mnemonic phrase'
      jest
        .spyOn(storageManager, 'getItem')
        .mockResolvedValueOnce(mockEnvelope)
        .mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockRejectedValueOnce(new Error('Unknown error'))
      await expect(baseClient.backupWallet('mock-password')).rejects.toThrow(
        'Unknown error'
      )
    })

    it('should refresh the token and retry if got an AccessTokenError (401): Unauthorized', async () => {
      const mockWallet = await createMockWallet()
      const mockMnemonic = 'test mnemonic phrase'
      const mockEncryptedData = {
        encryptedMnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        encryptedWallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        salt: 'test-salt',
        iterations: 1000,
        wrappedMasterKey: 'test-wrapped-master-key',
        wrapNonce: 'test-wrap-nonce',
      }
      jest
        .spyOn(storageManager, 'getItem')
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(mockMnemonic)
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(encryptionManager, 'encryptWallet')
        .mockResolvedValueOnce(mockEncryptedData)
        .mockResolvedValueOnce(mockEncryptedData)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockResolvedValue('test-fingerprint')
      jest
        .spyOn(backupManager, 'saveBackup')
        .mockRejectedValueOnce(new AccessTokenError())
        .mockResolvedValueOnce(undefined)

      jest
        .spyOn(backupManager, 'getAccessTokenFromClient')
        .mockReturnValueOnce('old-token')
      jest
        .spyOn(authenticationManager, 'getAccessToken')
        .mockResolvedValueOnce('new-refreshed-token')

      await baseClient.backupWallet('test-password')

      expect(backupManager.getAccessTokenFromClient).toHaveBeenCalled()
      expect(authenticationManager.getAccessToken).toHaveBeenCalledWith(
        'old-token'
      )
      expect(backupManager.updateAccessToken).toHaveBeenCalledWith(
        'new-refreshed-token'
      )
      expect(backupManager.saveBackup).toHaveBeenCalledTimes(2)
    })

    it('should throw a SDK error if the token refresh fails', async () => {
      const mockWallet = await createMockWallet()
      const mockMnemonic = 'test mnemonic phrase'
      const mockEncryptedData = {
        encryptedMnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        encryptedWallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        salt: 'test-salt',
        iterations: 1000,
        wrappedMasterKey: 'test-wrapped-master-key',
        wrapNonce: 'test-wrap-nonce',
      }
      jest
        .spyOn(storageManager, 'getItem')
        .mockResolvedValueOnce(mockWallet)
        .mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(encryptionManager, 'encryptWallet')
        .mockResolvedValueOnce(mockEncryptedData)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockResolvedValue('test-fingerprint')
      jest
        .spyOn(backupManager, 'saveBackup')
        .mockRejectedValueOnce(new AccessTokenError())

      jest
        .spyOn(backupManager, 'getAccessTokenFromClient')
        .mockImplementationOnce(() => {
          throw new Error('Token refresh failed')
        })

      await expect(baseClient.backupWallet('test-password')).rejects.toThrow(
        'Token refresh failed'
      )

      expect(backupManager.getAccessTokenFromClient).toHaveBeenCalled()
      expect(backupManager.saveBackup).toHaveBeenCalledTimes(1)
      expect(authenticationManager.getAccessToken).not.toHaveBeenCalled()
    })
  })

  describe('retrieveWallet', () => {
    it('should retrieve wallet successfully', async () => {
      const mockEnvelope = {
        version: 1 as const,
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        wallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        accountsCount: 1,
        salt: 'test-salt',
        protection: {
          kdf: {
            name: 'pbkdf2' as const,
            iterations: 1000,
            salt: 'test-salt',
          },
          wrappedMasterKey: 'test-wrapped-master-key',
          wrapNonce: 'test-wrap-nonce',
        },
      }
      jest
        .spyOn(backupManager, 'retrieveBackup')
        .mockResolvedValueOnce(mockEnvelope)
      jest.spyOn(storageManager, 'setItem').mockResolvedValueOnce(undefined)
      const mockWallet = await createMockWallet()
      jest.spyOn(encryptionManager, 'decryptWallet').mockResolvedValueOnce({
        wallet: mockWallet,
        mnemonic: 'test-mnemonic',
      })
      const result = await baseClient.retrieveWallet('test-password')
      expect(result).toEqual({
        wallet: mockWallet,
        mnemonic: 'test-mnemonic',
      })
      expect(encryptionManager.decryptWallet).toHaveBeenCalledWith(
        'test-password',
        mockEnvelope
      )
    })

    it('should throw an error a backup error if the backup fails', async () => {
      jest
        .spyOn(backupManager, 'retrieveBackup')
        .mockRejectedValueOnce(new BackupNotFoundError())
      await expect(baseClient.retrieveWallet('test-password')).rejects.toThrow(
        BackupNotFoundError
      )
    })

    it('should throw an error if the decryption fails', async () => {
      const mockEnvelope = {
        version: 1 as const,
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        wallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        accountsCount: 1,
        salt: 'test-salt',
        protection: {
          kdf: {
            name: 'pbkdf2' as const,
            iterations: 1000,
            salt: 'test-salt',
          },
          wrappedMasterKey: 'test-wrapped-master-key',
          wrapNonce: 'test-wrap-nonce',
        },
      }
      jest
        .spyOn(backupManager, 'retrieveBackup')
        .mockResolvedValueOnce(mockEnvelope)
      jest
        .spyOn(encryptionManager, 'decryptWallet')
        .mockRejectedValueOnce(new InvalidMnemonicError())
      await expect(baseClient.retrieveWallet('test-password')).rejects.toThrow(
        InvalidMnemonicError
      )
    })

    it('should throw an error if the unknown error occurs', async () => {
      jest
        .spyOn(backupManager, 'retrieveBackup')
        .mockRejectedValueOnce(new Error('Unknown error'))
      await expect(baseClient.retrieveWallet('test-password')).rejects.toThrow(
        'Unknown error'
      )
    })

    it('should refresh the token and retry if got an AccessTokenError (401): Unauthorized', async () => {
      jest
        .spyOn(backupManager, 'retrieveBackup')
        .mockRejectedValueOnce(new AccessTokenError())

      jest
        .spyOn(backupManager, 'getAccessTokenFromClient')
        .mockReturnValueOnce('old-token')
      jest
        .spyOn(authenticationManager, 'getAccessToken')
        .mockResolvedValueOnce('new-refreshed-token')

      const mockEnvelope = {
        version: 1 as const,
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonic: 'test-encrypted-mnemonic',
        mnemonicNonce: 'test-mnemonic-nonce',
        wallet: 'test-encrypted-wallet',
        walletNonce: 'test-wallet-nonce',
        accountsCount: 1,
        salt: 'test-salt',
        protection: {
          kdf: {
            name: 'pbkdf2' as const,
            iterations: 1000,
            salt: 'test-salt',
          },
          wrappedMasterKey: 'test-wrapped-master-key',
          wrapNonce: 'test-wrap-nonce',
        },
      }
      jest
        .spyOn(backupManager, 'retrieveBackup')
        .mockResolvedValueOnce(mockEnvelope)
      const mockWallet = await createMockWallet()
      jest.spyOn(encryptionManager, 'decryptWallet').mockResolvedValueOnce({
        wallet: mockWallet,
        mnemonic: 'test-mnemonic',
      })

      const result = await baseClient.retrieveWallet('test-password')
      expect(result).toEqual({
        wallet: mockWallet,
        mnemonic: 'test-mnemonic',
      })
      expect(backupManager.getAccessTokenFromClient).toHaveBeenCalled()
      expect(authenticationManager.getAccessToken).toHaveBeenCalledWith(
        'old-token'
      )
      expect(backupManager.updateAccessToken).toHaveBeenCalledWith(
        'new-refreshed-token'
      )
      expect(backupManager.retrieveBackup).toHaveBeenCalledTimes(2)
    })

    it('should throw a SDK error if the token refresh fails', async () => {
      jest
        .spyOn(backupManager, 'retrieveBackup')
        .mockRejectedValueOnce(new AccessTokenError())
      jest
        .spyOn(backupManager, 'getAccessTokenFromClient')
        .mockImplementationOnce(() => {
          throw new Error('Token refresh failed')
        })
      await expect(baseClient.retrieveWallet('test-password')).rejects.toThrow(
        'Token refresh failed'
      )
    })
  })

  describe('deleteBackup', () => {
    it('should delete a backup successfully', async () => {
      const mockMnemonic = 'test mnemonic phrase'
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockResolvedValueOnce('test-fingerprint')
      jest.spyOn(backupManager, 'deleteBackup').mockResolvedValueOnce(undefined)
      await baseClient.deleteBackup('test-password')
      expect(storageManager.getItem).toHaveBeenCalledWith('mnemonic')
      expect(getFingerPrintFromMnemonic).toHaveBeenCalledWith(mockMnemonic)
      expect(backupManager.deleteBackup).toHaveBeenCalledWith(
        'test-fingerprint'
      )
    })

    it('should throw an error if the mnemonic is not found in storage', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)
      const error = await baseClient
        .deleteBackup('test-password')
        .catch((e) => e)
      expect(error).toBeInstanceOf(WalletNotStoredError)
    })

    it('should throw a backup error if the backup fails', async () => {
      const mockMnemonic = 'test mnemonic phrase'
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockResolvedValueOnce('test-fingerprint')
      jest
        .spyOn(backupManager, 'deleteBackup')
        .mockRejectedValueOnce(new BackupNotFoundError())
      await expect(baseClient.deleteBackup('test-password')).rejects.toThrow(
        BackupNotFoundError
      )
    })

    it('should throw a SDK error if an unknown error occurs', async () => {
      const mockMnemonic = 'test mnemonic phrase'
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockRejectedValueOnce(new Error('Unknown error'))
      await expect(baseClient.deleteBackup('test-password')).rejects.toThrow(
        Error
      )
    })

    it('should refresh the token and retry if got an AccessTokenError (401): Unauthorized', async () => {
      const mockMnemonic = 'test mnemonic phrase'
      jest
        .spyOn(storageManager, 'getItem')
        .mockResolvedValueOnce(mockMnemonic)
        .mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockResolvedValue('test-fingerprint')
      jest
        .spyOn(backupManager, 'deleteBackup')
        .mockRejectedValueOnce(new AccessTokenError())

      jest
        .spyOn(backupManager, 'getAccessTokenFromClient')
        .mockReturnValueOnce('old-token')
      jest
        .spyOn(authenticationManager, 'getAccessToken')
        .mockResolvedValueOnce('new-refreshed-token')

      jest.spyOn(backupManager, 'deleteBackup').mockResolvedValueOnce(undefined)

      await baseClient.deleteBackup('test-password')

      expect(backupManager.getAccessTokenFromClient).toHaveBeenCalled()
      expect(authenticationManager.getAccessToken).toHaveBeenCalledWith(
        'old-token'
      )
      expect(backupManager.updateAccessToken).toHaveBeenCalledWith(
        'new-refreshed-token'
      )
      expect(backupManager.deleteBackup).toHaveBeenCalledTimes(2)
      expect(backupManager.deleteBackup).toHaveBeenCalledWith(
        'test-fingerprint'
      )
    })

    it('should throw a SDK error if the token refresh fails', async () => {
      const mockMnemonic = 'test mnemonic phrase'
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockMnemonic)
      jest
        .spyOn(helpers, 'getFingerPrintFromMnemonic')
        .mockResolvedValue('test-fingerprint')
      jest
        .spyOn(backupManager, 'deleteBackup')
        .mockRejectedValueOnce(new AccessTokenError())

      jest
        .spyOn(backupManager, 'getAccessTokenFromClient')
        .mockImplementationOnce(() => {
          throw new Error('Token refresh failed')
        })

      await expect(baseClient.deleteBackup('test-password')).rejects.toThrow(
        Error
      )

      expect(backupManager.getAccessTokenFromClient).toHaveBeenCalled()
      expect(backupManager.deleteBackup).toHaveBeenCalledTimes(1)
      expect(authenticationManager.getAccessToken).not.toHaveBeenCalled()
    })
  })

  describe('deleteBackupWithoutPassword', () => {
    it('should delete the existing backup without decrypting local wallet', async () => {
      jest
        .spyOn(backupManager, 'deleteExistingBackup')
        .mockResolvedValueOnce(undefined)

      await baseClient.deleteBackupWithoutPassword()

      expect(backupManager.deleteExistingBackup).toHaveBeenCalled()
    })
  })

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      jest
        .spyOn(authenticationManager, 'signOut')
        .mockResolvedValueOnce(undefined)
      await baseClient.signOut()
      expect(authenticationManager.signOut).toHaveBeenCalled()
    })
    it('should throw an auth error if the sign out fails under an known error', async () => {
      jest
        .spyOn(authenticationManager, 'signOut')
        .mockRejectedValueOnce(
          new AuthError('Authentication failed', 'AUTHENTICATION_ERROR')
        )
      await expect(baseClient.signOut()).rejects.toThrow(AuthError)
    })
    it('should throw an auth error if the sign out fails under an unknown error', async () => {
      jest
        .spyOn(authenticationManager, 'signOut')
        .mockRejectedValueOnce(new Error('Unknown error'))
      await expect(baseClient.signOut()).rejects.toThrow(Error)
    })
  })

  describe('getWalletAccounts', () => {
    it('should return the wallet accounts successfully', async () => {
      const mockWallet = await createMockWallet()
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      const result = await baseClient.getWalletAccounts()
      expect(result).toEqual(mockWallet.accounts)
    })
    it('should return an empty array if the wallet is not stored', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)
      const result = await baseClient.getWalletAccounts()
      expect(result).toEqual([])
    })
  })

  describe('sendStx', () => {
    it('should send STX successfully', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'sendStx').mockResolvedValueOnce('mock-txid-123')

      const result = await baseClient.sendStx(
        0,
        'SP987654321098765432109876543210987654321',
        1.5,
        NetworkType.Mainnet,
        'Test memo'
      )

      expect(result).toBe('mock-txid-123')
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.sendStx).toHaveBeenCalledWith(
        expect.any(String),
        'SP987654321098765432109876543210987654321',
        1.5,
        NetworkType.Mainnet,
        'Test memo'
      )
    })

    it('should send STX without memo', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'sendStx').mockResolvedValueOnce('mock-txid-456')

      const result = await baseClient.sendStx(
        0,
        'SP987654321098765432109876543210987654321',
        2.0,
        NetworkType.Testnet
      )

      expect(result).toBe('mock-txid-456')
      expect(stacksClient.sendStx).toHaveBeenCalledWith(
        expect.any(String),
        'SP987654321098765432109876543210987654321',
        2.0,
        NetworkType.Testnet,
        undefined
      )
    })

    it('should throw WalletNotStoredError if wallet is not found', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)

      const error = await baseClient
        .sendStx(
          0,
          'SP987654321098765432109876543210987654321',
          1.0,
          NetworkType.Mainnet
        )
        .catch((e) => e)

      expect(error).toBeInstanceOf(WalletNotStoredError)
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.sendStx).not.toHaveBeenCalled()
    })

    it('should throw PrivateKeyNotFoundError when derivePrivateKey fails (EncryptionError is re-thrown)', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(helpers, 'derivePrivateKey').mockImplementationOnce(() => {
        throw new PrivateKeyNotFoundError()
      })

      // Verify EncryptionError is thrown directly
      await expect(
        baseClient.sendStx(
          0,
          'SP987654321098765432109876543210987654321',
          1.0,
          NetworkType.Mainnet
        )
      ).rejects.toThrow(PrivateKeyNotFoundError)
    })

    it('should throw Error if storage getItem throws an unknown error', async () => {
      jest
        .spyOn(storageManager, 'getItem')
        .mockRejectedValueOnce(new Error('Storage error'))

      await expect(
        baseClient.sendStx(
          0,
          'SP987654321098765432109876543210987654321',
          1.0,
          NetworkType.Mainnet
        )
      ).rejects.toThrow(Error)
    })

    it('should throw Error if an unknown error occurs in stacksClient', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'sendStx')
        .mockRejectedValueOnce(new Error('Unknown error'))

      await expect(
        baseClient.sendStx(
          0,
          'SP987654321098765432109876543210987654321',
          1.0,
          NetworkType.Mainnet
        )
      ).rejects.toThrow(Error)
    })
  })

  describe('transferNFT', () => {
    it('should transfer NFT successfully on mainnet', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'transferNFT')
        .mockResolvedValueOnce('mock-nft-txid-123')

      const result = await baseClient.transferNFT(
        0,
        'SP1111111111111111111111111111111111111111.contract-name',
        '123',
        'SP987654321098765432109876543210987654321',
        NetworkType.Mainnet
      )

      expect(result).toBe('mock-nft-txid-123')
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.transferNFT).toHaveBeenCalledWith(
        'SP1111111111111111111111111111111111111111.contract-name',
        '123',
        expect.any(String),
        'SP123456789012345678901234567890123456789',
        'SP987654321098765432109876543210987654321',
        NetworkType.Mainnet
      )
    })

    it('should transfer NFT successfully on testnet', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'transferNFT')
        .mockResolvedValueOnce('mock-nft-txid-456')

      const result = await baseClient.transferNFT(
        0,
        'ST2222222222222222222222222222222222222222.contract-name',
        '456',
        'ST987654321098765432109876543210987654321',
        NetworkType.Testnet
      )

      expect(result).toBe('mock-nft-txid-456')
      expect(stacksClient.transferNFT).toHaveBeenCalledWith(
        'ST2222222222222222222222222222222222222222.contract-name',
        '456',
        expect.any(String),
        'ST123456789012345678901234567890123456789',
        'ST987654321098765432109876543210987654321',
        NetworkType.Testnet
      )
    })

    it('should throw WalletNotStoredError if wallet is not found', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)

      // Verify it's wrapped in SDKError with original error
      const error = await baseClient
        .transferNFT(
          0,
          'SP1111111111111111111111111111111111111111.contract-name',
          '123',
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
        .catch((e) => e)

      expect(error).toBeInstanceOf(WalletNotStoredError)
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.transferNFT).not.toHaveBeenCalled()
    })

    it('should throw PrivateKeyNotFoundError when derivePrivateKey fails (EncryptionError is re-thrown)', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(helpers, 'derivePrivateKey').mockImplementationOnce(() => {
        throw new PrivateKeyNotFoundError()
      })

      // Verify it's not wrapped in SDKError (EncryptionError is re-thrown by errorHandler)
      const error = await baseClient
        .transferNFT(
          0,
          'SP1111111111111111111111111111111111111111.contract-name',
          '123',
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
        .catch((e) => e)
      expect(error).toBeInstanceOf(PrivateKeyNotFoundError)
      expect(error).toBeInstanceOf(EncryptionError)
    })

    it('should throw SDKError if account index is out of bounds', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)

      await expect(
        baseClient.transferNFT(
          5, // Invalid account index
          'SP1111111111111111111111111111111111111111.contract-name',
          '123',
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
      ).rejects.toThrow(Error)
    })

    it('should throw Error if storage getItem throws an unknown error', async () => {
      jest
        .spyOn(storageManager, 'getItem')
        .mockRejectedValueOnce(new Error('Storage error'))

      await expect(
        baseClient.transferNFT(
          0,
          'SP1111111111111111111111111111111111111111.contract-name',
          '123',
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
      ).rejects.toThrow(Error)
    })

    it('should throw Error if an unknown error occurs', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'transferNFT')
        .mockRejectedValueOnce(new Error('Unknown error'))

      await expect(
        baseClient.transferNFT(
          0,
          'SP1111111111111111111111111111111111111111.contract-name',
          '123',
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
      ).rejects.toThrow(Error)
    })
  })

  describe('transferFT', () => {
    it('should transfer fungible token successfully on mainnet', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'transferFT')
        .mockResolvedValueOnce('mock-ft-txid-123')

      const result = await baseClient.transferFT(
        0,
        'SP1111111111111111111111111111111111111111.contract-name',
        1000,
        'SP987654321098765432109876543210987654321',
        NetworkType.Mainnet
      )

      expect(result).toBe('mock-ft-txid-123')
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.transferFT).toHaveBeenCalledWith(
        'SP1111111111111111111111111111111111111111.contract-name',
        1000,
        expect.any(String),
        'SP123456789012345678901234567890123456789',
        'SP987654321098765432109876543210987654321',
        NetworkType.Mainnet
      )
    })

    it('should transfer fungible token successfully on testnet', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'transferFT')
        .mockResolvedValueOnce('mock-ft-txid-456')

      const result = await baseClient.transferFT(
        0,
        'ST2222222222222222222222222222222222222222.contract-name',
        500,
        'ST987654321098765432109876543210987654321',
        NetworkType.Testnet
      )

      expect(result).toBe('mock-ft-txid-456')
      expect(stacksClient.transferFT).toHaveBeenCalledWith(
        'ST2222222222222222222222222222222222222222.contract-name',
        500,
        expect.any(String),
        'ST123456789012345678901234567890123456789',
        'ST987654321098765432109876543210987654321',
        NetworkType.Testnet
      )
    })

    it('should throw WalletNotStoredError if wallet is not found', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)

      // Verify it's wrapped in SDKError with original error
      const error = await baseClient
        .transferFT(
          0,
          'SP1111111111111111111111111111111111111111.contract-name',
          1000,
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
        .catch((e) => e)

      expect(error).toBeInstanceOf(WalletNotStoredError)
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.transferFT).not.toHaveBeenCalled()
    })

    it('should throw PrivateKeyNotFoundError when derivePrivateKey fails (EncryptionError is re-thrown)', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(helpers, 'derivePrivateKey').mockImplementationOnce(() => {
        throw new PrivateKeyNotFoundError()
      })

      // Verify it's not wrapped in SDKError (EncryptionError is re-thrown by errorHandler)
      const error = await baseClient
        .transferFT(
          0,
          'SP1111111111111111111111111111111111111111.contract-name',
          1000,
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
        .catch((e) => e)
      expect(error).toBeInstanceOf(PrivateKeyNotFoundError)
      expect(error).toBeInstanceOf(EncryptionError)
    })

    it('should throw SDKError if account index is out of bounds', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)

      await expect(
        baseClient.transferFT(
          5, // Invalid account index
          'SP1111111111111111111111111111111111111111.contract-name',
          1000,
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
      ).rejects.toThrow(Error)
    })

    it('should throw Error if storage getItem throws an unknown error', async () => {
      jest
        .spyOn(storageManager, 'getItem')
        .mockRejectedValueOnce(new Error('Storage error'))

      await expect(
        baseClient.transferFT(
          0,
          'SP1111111111111111111111111111111111111111.contract-name',
          1000,
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
      ).rejects.toThrow(Error)
    })

    it('should throw Error if an unknown error occurs', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [
        {
          index: 0,
          publicKey: 'mock-public-key',
          addresses: {
            mainnet: 'SP123456789012345678901234567890123456789',
            testnet: 'ST123456789012345678901234567890123456789',
          },
        },
      ]
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'transferFT')
        .mockRejectedValueOnce(new Error('Unknown error'))

      await expect(
        baseClient.transferFT(
          0,
          'SP1111111111111111111111111111111111111111.contract-name',
          1000,
          'SP987654321098765432109876543210987654321',
          NetworkType.Mainnet
        )
      ).rejects.toThrow(Error)
    })
  })

  describe('stackSTX', () => {
    const mockAccount = {
      index: 0,
      publicKey: 'mock-public-key',
      addresses: {
        mainnet: 'SP123456789012345678901234567890123456789',
        testnet: 'ST123456789012345678901234567890123456789',
      },
    }

    it('should stack STX successfully', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]
      const mockBtcAddresses = {
        mainnet: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        testnet: 'tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      }

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValueOnce({
        nextRewardCycle: 6,
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
      })
      jest.spyOn(stacksClient, 'getBalance').mockResolvedValueOnce(1000)
      jest
        .spyOn(helpers, 'getBitcoinAddressesFromStacksWallet')
        .mockResolvedValueOnce(mockBtcAddresses)
      jest
        .spyOn(stackingClient, 'stackStx')
        .mockResolvedValueOnce('mock-stacking-txid')

      const result = await baseClient.stackSTX(mockAccount, 500, 6, 1000)

      expect(result).toBe('mock-stacking-txid')
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.getPoxData).toHaveBeenCalled()
      expect(stacksClient.getBalance).toHaveBeenCalledWith(mockAccount)
      expect(helpers.getBitcoinAddressesFromStacksWallet).toHaveBeenCalledWith(
        HDKey.fromExtendedKey(mockWallet.privateKey),
        mockAccount.index
      )
      expect(stackingClient.stackStx).toHaveBeenCalledWith(
        expect.any(String),
        5, // currentRewardCycle
        500, // amount
        mockBtcAddresses,
        100000, // currentBurnHeight
        6, // lockPeriod
        1000, // maxAmount
        undefined // options
      )
    })

    it('should throw MinimumThresholdNotMetError if balance is below threshold', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValueOnce({
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
        nextRewardCycle: 6,
      })
      jest.spyOn(stacksClient, 'getBalance').mockResolvedValueOnce(0.5) // Below threshold

      await expect(
        baseClient.stackSTX(mockAccount, 500, 6, 1000)
      ).rejects.toThrow(MinimumThresholdNotMetError)
    })

    it('should throw InvalidAmountError if amount exceeds balance', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValueOnce({
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
        nextRewardCycle: 6,
      })
      jest.spyOn(stacksClient, 'getBalance').mockResolvedValueOnce(100)

      await expect(
        baseClient.stackSTX(mockAccount, 500, 6, 1000)
      ).rejects.toThrow(InvalidAmountError)
    })

    it('should throw MaxAmountSmallerThanAmountError if maxAmount is less than amount', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValueOnce({
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
        nextRewardCycle: 6,
      })
      jest.spyOn(stacksClient, 'getBalance').mockResolvedValueOnce(1000)

      await expect(
        baseClient.stackSTX(mockAccount, 500, 6, 400)
      ).rejects.toThrow(MaxAmountSmallerThanAmountError)
    })

    it('should throw MaxAmountBiggerThanBalanceError if maxAmount exceeds balance', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValueOnce({
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
        nextRewardCycle: 6,
      })
      jest.spyOn(stacksClient, 'getBalance').mockResolvedValueOnce(1000)

      await expect(
        baseClient.stackSTX(mockAccount, 500, 6, 2000)
      ).rejects.toThrow(MaxAmountGreaterThanBalanceError)
    })

    it('should throw InvalidLockPeriod if lockPeriod is invalid', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValue(mockWallet)
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValue({
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
        nextRewardCycle: 6,
      })
      jest.spyOn(stacksClient, 'getBalance').mockResolvedValue(1000)
      jest
        .spyOn(helpers, 'getBitcoinAddressesFromStacksWallet')
        .mockResolvedValue({
          mainnet: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
          testnet: 'tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        })
      jest.spyOn(stackingClient, 'stackStx').mockResolvedValue('mock-txid')

      await expect(
        baseClient.stackSTX(mockAccount, 500, 13, 1000)
      ).rejects.toThrow(InvalidLockPeriod)

      await expect(
        baseClient.stackSTX(mockAccount, 500, 0, 1000)
      ).rejects.toThrow(InvalidLockPeriod)
    })

    it('should throw WalletNotStoredError if wallet is not found', async () => {
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValueOnce({
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
        nextRewardCycle: 6,
      })
      jest.spyOn(stacksClient, 'getBalance').mockResolvedValueOnce(1000)
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)

      const error = await baseClient
        .stackSTX(mockAccount, 500, 6, 1000)
        .catch((e) => e)

      expect(error).toBeInstanceOf(WalletNotStoredError)
    })

    it('should throw Error if an unknown error occurs', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValueOnce({
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
        nextRewardCycle: 6,
      })
      jest.spyOn(stacksClient, 'getBalance').mockResolvedValueOnce(1000)
      jest
        .spyOn(helpers, 'getBitcoinAddressesFromStacksWallet')
        .mockRejectedValueOnce(new Error('Unknown error'))

      await expect(
        baseClient.stackSTX(mockAccount, 500, 6, 1000)
      ).rejects.toThrow(Error)
    })
  })

  describe('stackExtend', () => {
    const mockAccount = {
      index: 0,
      publicKey: 'mock-public-key',
      addresses: {
        mainnet: 'SP123456789012345678901234567890123456789',
        testnet: 'ST123456789012345678901234567890123456789',
      },
    }

    it('should extend stacking successfully', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]
      const mockBtcAddresses = {
        mainnet: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        testnet: 'tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      }

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValueOnce({
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
        nextRewardCycle: 6,
      })
      jest
        .spyOn(helpers, 'getBitcoinAddressesFromStacksWallet')
        .mockResolvedValueOnce(mockBtcAddresses)
      jest
        .spyOn(stackingClient, 'stackExtend')
        .mockResolvedValueOnce('mock-extend-txid')

      const result = await baseClient.stackExtend(mockAccount, 3, 1000)

      expect(result).toBe('mock-extend-txid')
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.getPoxData).toHaveBeenCalled()
      expect(helpers.getBitcoinAddressesFromStacksWallet).toHaveBeenCalledWith(
        HDKey.fromExtendedKey(mockWallet.privateKey),
        mockAccount.index
      )
      expect(stackingClient.stackExtend).toHaveBeenCalledWith(
        expect.any(String),
        5, // currentRewardCycle
        3, // extendCount
        mockBtcAddresses,
        1000, // maxAmount
        undefined // options
      )
    })

    it('should throw WalletNotStoredError if wallet is not found', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)

      const error = await baseClient
        .stackExtend(mockAccount, 3, 1000)
        .catch((e) => e)

      expect(error).toBeInstanceOf(WalletNotStoredError)
    })

    it('should throw Error if an unknown error occurs', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'getPoxData')
        .mockRejectedValueOnce(new Error('Unknown error'))

      await expect(
        baseClient.stackExtend(mockAccount, 3, 1000)
      ).rejects.toThrow('Unknown error')
    })
  })

  describe('stackIncrease', () => {
    const mockAccount = {
      index: 0,
      publicKey: 'mock-public-key',
      addresses: {
        mainnet: 'SP123456789012345678901234567890123456789',
        testnet: 'ST123456789012345678901234567890123456789',
      },
    }

    it('should increase stacking successfully', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]
      const mockBtcAddresses = {
        mainnet: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        testnet: 'tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      }

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest.spyOn(stacksClient, 'getPoxData').mockResolvedValueOnce({
        minimumThreshold: 1000000,
        currentBurnHeight: 100000,
        currentRewardCycle: 5,
        nextRewardCycle: 6,
      })
      jest
        .spyOn(helpers, 'getBitcoinAddressesFromStacksWallet')
        .mockResolvedValueOnce(mockBtcAddresses)
      jest
        .spyOn(stackingClient, 'stackIncrease')
        .mockResolvedValueOnce('mock-increase-txid')

      const result = await baseClient.stackIncrease(mockAccount, 200, 1000, 4)

      expect(result).toBe('mock-increase-txid')
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.getPoxData).toHaveBeenCalled()
      expect(helpers.getBitcoinAddressesFromStacksWallet).toHaveBeenCalledWith(
        HDKey.fromExtendedKey(mockWallet.privateKey),
        mockAccount.index
      )
      expect(stackingClient.stackIncrease).toHaveBeenCalledWith(
        expect.any(String),
        5, // currentRewardCycle
        mockBtcAddresses,
        200, // increaseBy
        1000, // maxAmount
        4, // currentLockPeriod
        undefined // options
      )
    })

    it('should throw WalletNotStoredError if wallet is not found', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)

      const error = await baseClient
        .stackIncrease(mockAccount, 200, 1000, 4)
        .catch((e) => e)

      expect(error).toBeInstanceOf(WalletNotStoredError)
    })

    it('should throw Error if an unknown error occurs', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'getPoxData')
        .mockRejectedValueOnce(new Error('Unknown error'))

      await expect(
        baseClient.stackIncrease(mockAccount, 200, 1000, 4)
      ).rejects.toThrow('Unknown error')
    })
  })

  describe('delegateSTX', () => {
    const mockAccount = {
      index: 0,
      publicKey: 'mock-public-key',
      addresses: {
        mainnet: 'SP123456789012345678901234567890123456789',
        testnet: 'ST123456789012345678901234567890123456789',
      },
    }
    const mockPool: StackingPool = {
      name: 'Test Pool',
      address: 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP',
    }

    it('should delegate STX successfully with all options', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]
      const mockBtcAddresses = {
        mainnet: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        testnet: 'tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      }

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(helpers, 'getBitcoinAddressesFromStacksWallet')
        .mockResolvedValueOnce(mockBtcAddresses)
      jest
        .spyOn(stackingClient, 'delegateStx')
        .mockResolvedValueOnce('mock-delegate-txid')

      const result = await baseClient.delegateSTX(
        mockAccount,
        100,
        mockPool,
        100000
      )

      expect(result).toBe('mock-delegate-txid')
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(helpers.getBitcoinAddressesFromStacksWallet).toHaveBeenCalledWith(
        HDKey.fromExtendedKey(mockWallet.privateKey),
        mockAccount.index
      )
      expect(stackingClient.delegateStx).toHaveBeenCalledWith(
        expect.any(String),
        mockPool,
        100,
        {
          untilBurnHeight: 100000,
          btcAddresses: mockBtcAddresses,
        }
      )
    })

    it('should delegate STX successfully without untilBurnHeight', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]
      const mockBtcAddresses = {
        mainnet: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        testnet: 'tb1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      }

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(helpers, 'getBitcoinAddressesFromStacksWallet')
        .mockResolvedValueOnce(mockBtcAddresses)
      jest
        .spyOn(stackingClient, 'delegateStx')
        .mockResolvedValueOnce('mock-delegate-txid')

      const result = await baseClient.delegateSTX(mockAccount, 100, mockPool)

      expect(result).toBe('mock-delegate-txid')
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stackingClient.delegateStx).toHaveBeenCalledWith(
        expect.any(String),
        mockPool,
        100,
        {
          btcAddresses: mockBtcAddresses,
        }
      )
    })

    it('should throw WalletNotStoredError if wallet is not found', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)

      const error = await baseClient
        .delegateSTX(mockAccount, 100, mockPool)
        .catch((e) => e)

      expect(error).toBeInstanceOf(WalletNotStoredError)
    })

    it('should throw Error if an unknown error occurs', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(helpers, 'getBitcoinAddressesFromStacksWallet')
        .mockRejectedValueOnce(new Error('Unknown error'))

      await expect(
        baseClient.delegateSTX(mockAccount, 100, mockPool)
      ).rejects.toThrow('Unknown error')
    })
  })

  describe('revokeDelegation', () => {
    const mockAccount = {
      index: 0,
      publicKey: 'mock-public-key',
      addresses: {
        mainnet: 'SP123456789012345678901234567890123456789',
        testnet: 'ST123456789012345678901234567890123456789',
      },
    }

    it('should revoke delegation successfully', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stackingClient, 'revokeDelegation')
        .mockResolvedValueOnce('mock-revoke-txid')

      const result = await baseClient.revokeDelegation(mockAccount)

      expect(result).toBe('mock-revoke-txid')
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stackingClient.revokeDelegation).toHaveBeenCalledWith(
        expect.any(String)
      )
    })

    it('should throw WalletNotStoredError if wallet is not found', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)

      const error = await baseClient
        .revokeDelegation(mockAccount)
        .catch((e) => e)

      expect(error).toBeInstanceOf(WalletNotStoredError)
    })

    it('should throw Error if an unknown error occurs', async () => {
      const mockWallet = await createMockWallet()
      mockWallet.accounts = [mockAccount]

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stackingClient, 'revokeDelegation')
        .mockRejectedValueOnce(new Error('Unknown error'))

      await expect(baseClient.revokeDelegation(mockAccount)).rejects.toThrow(
        'Unknown error'
      )
    })
  })

  describe('makeContractCall', () => {
    it('should make contract call successfully', async () => {
      const mockWallet = await createMockWallet()
      const contractAddress =
        'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ.my-contract'
      const functionName = 'my-function'
      const mockUintCV = { type: 'uint', value: BigInt(100) } as ClarityValue
      const mockStringCV = {
        type: 'string',
        value: 'test',
      } as unknown as ClarityValue
      const functionArgs: ClarityValue[] = [mockUintCV, mockStringCV]
      const mockTxid = '0xabcdef1234567890'

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'makeContractCall')
        .mockResolvedValueOnce(mockTxid)

      const result = await baseClient.makeContractCall(
        contractAddress,
        functionName,
        functionArgs
      )

      expect(result).toBe(mockTxid)
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.makeContractCall).toHaveBeenCalledWith(
        'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'my-contract',
        functionName,
        functionArgs,
        expect.any(String),
        undefined
      )
    })

    it('should make contract call with postConditionMode', async () => {
      const mockWallet = await createMockWallet()
      const contractAddress =
        'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ.my-contract'
      const functionName = 'my-function'
      const mockUintCV = { type: 'uint', value: BigInt(100) } as ClarityValue
      const functionArgs: ClarityValue[] = [mockUintCV]
      const mockTxid = '0xabcdef1234567890'
      const { PostConditionMode } = await import('@stacks/transactions')

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'makeContractCall')
        .mockResolvedValueOnce(mockTxid)

      const result = await baseClient.makeContractCall(
        contractAddress,
        functionName,
        functionArgs,
        PostConditionMode.Allow
      )

      expect(result).toBe(mockTxid)
      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.makeContractCall).toHaveBeenCalledWith(
        'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        'my-contract',
        functionName,
        functionArgs,
        expect.any(String),
        PostConditionMode.Allow
      )
    })

    it('should throw WalletNotStoredError if wallet is not found', async () => {
      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(null)

      await expect(
        baseClient.makeContractCall(
          'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ.my-contract',
          'my-function',
          []
        )
      ).rejects.toThrow(WalletNotStoredError)

      expect(storageManager.getItem).toHaveBeenCalledWith('wallet')
      expect(stacksClient.makeContractCall).not.toHaveBeenCalled()
    })

    it('should parse contract address correctly', async () => {
      const mockWallet = await createMockWallet()
      const contractAddress =
        'ST9876543210FEDCBAZYXWVUTSRQPONMLKJIHG.another-contract'
      const functionName = 'transfer'
      const mockUintCV = { type: 'uint', value: BigInt(500) } as ClarityValue
      const functionArgs: ClarityValue[] = [mockUintCV]
      const mockTxid = '0x1234567890abcdef'

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'makeContractCall')
        .mockResolvedValueOnce(mockTxid)

      const result = await baseClient.makeContractCall(
        contractAddress,
        functionName,
        functionArgs
      )

      expect(result).toBe(mockTxid)
      expect(stacksClient.makeContractCall).toHaveBeenCalledWith(
        'ST9876543210FEDCBAZYXWVUTSRQPONMLKJIHG',
        'another-contract',
        functionName,
        functionArgs,
        expect.any(String), // senderKey derived from wallet
        undefined // postConditionMode defaults to undefined (will use default in stacksClient)
      )
    })

    it('should use account index 0 for sender key derivation', async () => {
      const mockWallet = await createMockWallet()
      const contractAddress =
        'SP1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ.my-contract'
      const functionName = 'my-function'
      const functionArgs: ClarityValue[] = []
      const mockTxid = '0xtest123'

      jest.spyOn(storageManager, 'getItem').mockResolvedValueOnce(mockWallet)
      jest
        .spyOn(stacksClient, 'makeContractCall')
        .mockResolvedValueOnce(mockTxid)

      // Spy on derivePrivateKey to verify it's called with account index 0
      const derivePrivateKeySpy = jest.spyOn(helpers, 'derivePrivateKey')

      await baseClient.makeContractCall(
        contractAddress,
        functionName,
        functionArgs
      )

      expect(derivePrivateKeySpy).toHaveBeenCalled()
      // Verify the call includes the wallet's private key and account index 0
      const callArgs = derivePrivateKeySpy.mock.calls[0]
      expect(callArgs[1]).toBe(0) // account index should be 0
    })
  })
})
