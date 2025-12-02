import * as SecureStore from 'expo-secure-store'
import { SecureStore as SecureStoreClass } from '../../../src/storage/secureStore'

jest.mock('expo-secure-store', () => {
  const storage: Record<string, string> = {}
  return {
    setItemAsync: jest.fn(async (key: string, value: string): Promise<void> => {
      storage[key] = value
    }),
    getItemAsync: jest.fn(async (key: string): Promise<string | null> => {
      return storage[key] || null
    }),
    deleteItemAsync: jest.fn(async (key: string): Promise<void> => {
      delete storage[key]
    }),
    clearMockStorage: jest.fn((): void => {
      Object.keys(storage).forEach((key) => delete storage[key])
    }),
  }
})

describe('SecureStore unit tests', () => {
  const secureStore = new SecureStoreClass()

  beforeEach(() => {
    const mockStore = SecureStore as typeof SecureStore & {
      clearMockStorage: () => void
    }
    mockStore.clearMockStorage()
    jest.clearAllMocks()
  })

  describe('setItem', () => {
    it('should set an item successfully', async () => {
      await secureStore.setItem('test-key', 'test-value')
      await secureStore.setItem('wallet', {
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      })
      const keyValue = await SecureStore.getItemAsync('test-key')
      expect(keyValue).toBe('"test-value"')
      const walletValue = await SecureStore.getItemAsync('wallet')
      expect(JSON.parse(walletValue!)).toEqual({
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      })
    })
  })

  describe('getItem', () => {
    it('should get an item successfully', async () => {
      await secureStore.setItem('wallet', {
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      })

      await secureStore.setItem('test-key', 'test-value')
      const value = await secureStore.getItem('wallet')
      expect(value).toEqual({
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      })
      const keyValue = await secureStore.getItem('test-key')
      expect(keyValue).toBe('test-value')
    })

    it('should return null when the key does not exist', async () => {
      const value = await secureStore.getItem('non-existent-key')
      expect(value).toBeNull()
    })
  })

  describe('removeItem', () => {
    it('should remove an item successfully', async () => {
      await secureStore.setItem('test-key', 'test-value')
      await secureStore.removeItem('test-key')
      const value = await SecureStore.getItemAsync('test-key')
      expect(value).toBeNull()
    })
  })

  describe('clear', () => {
    it('should clear the storage successfully', async () => {
      await secureStore.setItem('test-key', 'test-value')
      await secureStore.setItem('wallet', {
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      })
      await secureStore.clear()
      const keyValue = await SecureStore.getItemAsync('test-key')
      expect(keyValue).toBeNull()
      const walletValue = await SecureStore.getItemAsync('wallet')
      expect(walletValue).toBeNull()
    })
  })
})
