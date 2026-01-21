import { MobileClient } from '../../../src/sdk/MobileClient'
import {
  NetworkType,
  Wallet,
  WalletNotStoredError,
  IStorageManager,
} from '@degenlab/stacks-wallet-kit-core'

// Mock the google signin
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    isSignedIn: jest.fn(),
    getCurrentUser: jest.fn(),
    getTokens: jest.fn(),
  },
  statusCodes: {
    SIGN_IN_CANCELLED: '0',
    IN_PROGRESS: '1',
    PLAY_SERVICES_NOT_AVAILABLE: '2',
  },
}))

// Mock storage manager
const createMockStorageManager = (): IStorageManager => {
  const storage: Record<string, unknown> = {}

  return {
    async setItem<T>(key: string, value: T): Promise<void> {
      storage[key] = value
    },
    async getItem<T>(key: string): Promise<T | null> {
      const value = storage[key]
      return value !== undefined ? (value as T) : null
    },
    async removeItem(key: string): Promise<void> {
      delete storage[key]
    },
    async clear(): Promise<void> {
      Object.keys(storage).forEach((key) => delete storage[key])
    },
  }
}

describe('MobileClient', () => {
  let mobileClient: MobileClient
  let mockStorageManager: IStorageManager

  beforeEach(() => {
    jest.clearAllMocks()

    mockStorageManager = createMockStorageManager()

    mobileClient = new MobileClient(
      'test-web-client-id',
      'test-ios-client-id',
      NetworkType.Testnet,
      {
        storageManager: mockStorageManager,
      }
    )
  })

  describe('getMnemonic', () => {
    it('should return mnemonic from storage successfully', async () => {
      const mockMnemonic =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

      // Set mnemonic in storage
      await mockStorageManager.setItem('mnemonic', mockMnemonic)

      const result = await mobileClient.getMnemonic()

      expect(result).toBe(mockMnemonic)
    })

    it('should return null when no mnemonic is stored', async () => {
      const result = await mobileClient.getMnemonic()

      expect(result).toBeNull()
    })

    it('should handle storage errors gracefully', async () => {
      const storageError = new Error('Storage read failed')

      // Mock storage getItem to throw an error
      jest
        .spyOn(mockStorageManager, 'getItem')
        .mockRejectedValueOnce(storageError)

      await expect(mobileClient.getMnemonic()).rejects.toThrow(
        'Storage read failed'
      )
    })

    it('should return empty string when stored mnemonic is empty', async () => {
      // Set empty string as mnemonic
      await mockStorageManager.setItem('mnemonic', '')

      const result = await mobileClient.getMnemonic()

      expect(result).toBe('')
    })

    it('should call storage getItem with correct key', async () => {
      const getItemSpy = jest.spyOn(mockStorageManager, 'getItem')
      await mockStorageManager.setItem('mnemonic', 'test-mnemonic')

      await mobileClient.getMnemonic()

      expect(getItemSpy).toHaveBeenCalledWith('mnemonic')
    })
  })

  describe('removeWalletAccount', () => {
    const createMockWallet = (): Wallet => ({
      privateKey:
        'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi',
      createdAt: new Date().toString(),
      accounts: [
        {
          index: 0,
          publicKey:
            '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
          addresses: {
            mainnet: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
            testnet: 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKPVKG2CE',
          },
        },
        {
          index: 1,
          publicKey:
            '02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
          addresses: {
            mainnet: 'SP3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF0691NZ159',
            testnet: 'ST3FGQ8Z7JY9BWYZ5WM53E0M9NK7WHJF06H54QFA8',
          },
        },
        {
          index: 2,
          publicKey:
            '02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
          addresses: {
            mainnet: 'SP1K1A1PMGW2ZJCNF46NWZWHG8TS1D23EGH1KNK60',
            testnet: 'ST1K1A1PMGW2ZJCNF46NWZWHG8TS1D23EGPFKAHK8',
          },
        },
      ],
    })

    it('should remove account at index 0 and update storage', async () => {
      const mockWallet = createMockWallet()

      // Set wallet in storage
      await mockStorageManager.setItem('wallet', mockWallet)
      const setItemSpy = jest.spyOn(mockStorageManager, 'setItem')

      await mobileClient.removeWalletAccount(0)

      // Verify the wallet was updated correctly
      expect(setItemSpy).toHaveBeenCalledWith('wallet', expect.any(Object))

      // Get the updated wallet from storage
      const updatedWallet = await mockStorageManager.getItem<Wallet>('wallet')

      expect(updatedWallet).not.toBeNull()
      expect(updatedWallet!.accounts).toHaveLength(2)
      expect(updatedWallet!.accounts[0].index).toBe(1)
      expect(updatedWallet!.accounts[1].index).toBe(2)
    })

    it('should remove account at index 1 (middle) and update storage', async () => {
      const mockWallet = createMockWallet()
      await mockStorageManager.setItem('wallet', mockWallet)

      await mobileClient.removeWalletAccount(1)

      const updatedWallet = await mockStorageManager.getItem<Wallet>('wallet')

      expect(updatedWallet!.accounts).toHaveLength(2)
      expect(updatedWallet!.accounts[0].index).toBe(0)
      expect(updatedWallet!.accounts[1].index).toBe(2)
    })

    it('should remove account at last index and update storage', async () => {
      const mockWallet = createMockWallet()
      await mockStorageManager.setItem('wallet', mockWallet)

      await mobileClient.removeWalletAccount(2)

      const updatedWallet = await mockStorageManager.getItem<Wallet>('wallet')

      expect(updatedWallet!.accounts).toHaveLength(2)
      expect(updatedWallet!.accounts[0].index).toBe(0)
      expect(updatedWallet!.accounts[1].index).toBe(1)
    })

    it('should handle removing the only account in wallet', async () => {
      const mockWallet: Wallet = {
        privateKey:
          'xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi',
        createdAt: new Date().toString(),
        accounts: [
          {
            index: 0,
            publicKey:
              '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
            addresses: {
              mainnet: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
              testnet: 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKPVKG2CE',
            },
          },
        ],
      }
      await mockStorageManager.setItem('wallet', mockWallet)

      await mobileClient.removeWalletAccount(0)

      const updatedWallet = await mockStorageManager.getItem<Wallet>('wallet')

      expect(updatedWallet!.accounts).toHaveLength(0)
    })

    it('should throw WalletNotStoredError when wallet is not found', async () => {
      await expect(mobileClient.removeWalletAccount(0)).rejects.toThrow(
        WalletNotStoredError
      )
      await expect(mobileClient.removeWalletAccount(0)).rejects.toThrow(
        'Wallet not found in local storage'
      )
    })

    it('should throw WalletNotStoredError with correct error code', async () => {
      try {
        await mobileClient.removeWalletAccount(0)
        fail('Should have thrown WalletNotStoredError')
      } catch (error) {
        expect(error).toBeInstanceOf(WalletNotStoredError)
        expect((error as WalletNotStoredError).code).toBe('WALLET_NOT_FOUND')
      }
    })

    it('should handle invalid account index gracefully', async () => {
      const mockWallet = createMockWallet()
      await mockStorageManager.setItem('wallet', mockWallet)

      // Try to remove account at invalid index (doesn't exist)
      await mobileClient.removeWalletAccount(10)

      const updatedWallet = await mockStorageManager.getItem<Wallet>('wallet')

      // splice handles out of bounds gracefully - no change to array
      expect(updatedWallet!.accounts).toHaveLength(3)
    })

    it('should handle negative index', async () => {
      const mockWallet = createMockWallet()
      await mockStorageManager.setItem('wallet', mockWallet)

      // Negative index removes from end: -1 removes last account
      await mobileClient.removeWalletAccount(-1)

      const updatedWallet = await mockStorageManager.getItem<Wallet>('wallet')

      // With -1, splice removes the last element
      expect(updatedWallet!.accounts).toHaveLength(2)
      expect(updatedWallet!.accounts[0].index).toBe(0)
      expect(updatedWallet!.accounts[1].index).toBe(1)
    })

    it('should handle storage getItem errors', async () => {
      const storageError = new Error('Storage read failed')
      jest
        .spyOn(mockStorageManager, 'getItem')
        .mockRejectedValueOnce(storageError)

      await expect(mobileClient.removeWalletAccount(0)).rejects.toThrow(
        'Storage read failed'
      )
    })

    it('should handle storage setItem errors', async () => {
      const mockWallet = createMockWallet()
      await mockStorageManager.setItem('wallet', mockWallet)

      const storageError = new Error('Storage write failed')
      jest
        .spyOn(mockStorageManager, 'setItem')
        .mockRejectedValueOnce(storageError)

      await expect(mobileClient.removeWalletAccount(0)).rejects.toThrow(
        'Storage write failed'
      )
    })

    it('should preserve wallet privateKey and createdAt after removing account', async () => {
      const mockWallet = createMockWallet()
      const originalPrivateKey = mockWallet.privateKey
      const originalCreatedAt = mockWallet.createdAt
      await mockStorageManager.setItem('wallet', mockWallet)

      await mobileClient.removeWalletAccount(1)

      const updatedWallet = await mockStorageManager.getItem<Wallet>('wallet')

      expect(updatedWallet!.privateKey).toBe(originalPrivateKey)
      expect(updatedWallet!.createdAt).toBe(originalCreatedAt)
    })

    it('should call storage methods in correct order', async () => {
      const mockWallet = createMockWallet()
      await mockStorageManager.setItem('wallet', mockWallet)

      const callOrder: string[] = []
      jest
        .spyOn(mockStorageManager, 'getItem')
        .mockImplementation(async () => {
          callOrder.push('getItem')
          return mockWallet
        })

      jest
        .spyOn(mockStorageManager, 'setItem')
        .mockImplementation(async () => {
          callOrder.push('setItem')
        })

      await mobileClient.removeWalletAccount(0)

      expect(callOrder).toEqual(['getItem', 'setItem'])
    })
  })
})
