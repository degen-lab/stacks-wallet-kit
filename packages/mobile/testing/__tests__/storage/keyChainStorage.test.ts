import * as KeyChain from 'react-native-keychain'
import { KeyChainStorage } from '../../../src/storage/keyChainStorage'

jest.mock('react-native-keychain', () => {
  const storage: Record<string, { username: string; password: string }> = {}
  return {
    setGenericPassword: jest.fn(
      async (
        username: string,
        password: string
      ): Promise<{ service: string } | false> => {
        storage[username] = { username, password }
        return { service: username }
      }
    ),
    getGenericPassword: jest.fn(
      async (options?: {
        service?: string
      }): Promise<
        | {
            service: string
            username: string
            password: string
          }
        | false
      > => {
        const service = options?.service
        if (!service) return false
        const item = storage[service]
        if (!item) return false
        return {
          service,
          username: item.username,
          password: item.password,
        }
      }
    ),
    resetGenericPassword: jest.fn(
      async (options?: { service?: string }): Promise<boolean> => {
        const service = options?.service
        if (service && storage[service]) {
          delete storage[service]
          return true
        }
        return false
      }
    ),
    ACCESSIBLE: {
      WHEN_UNLOCKED: 'WHEN_UNLOCKED',
      AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
      ALWAYS: 'ALWAYS',
      WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY',
      WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
      AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY:
        'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY',
      ALWAYS_THIS_DEVICE_ONLY: 'ALWAYS_THIS_DEVICE_ONLY',
    },
    clearMockStorage: jest.fn((): void => {
      Object.keys(storage).forEach((key) => delete storage[key])
    }),
  }
})

describe('KeyChainStorage unit tests', () => {
  const keyChainStorage = new KeyChainStorage()

  beforeEach(() => {
    const mockKeyChain = KeyChain as typeof KeyChain & {
      clearMockStorage: () => void
    }
    mockKeyChain.clearMockStorage()
    jest.clearAllMocks()
  })

  describe('setItem', () => {
    it('should set an item successfully', async () => {
      await keyChainStorage.setItem('test-key', 'test-value')
      await keyChainStorage.setItem('wallet', {
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      })
      const keyValue = await KeyChain.getGenericPassword({
        service: 'test-key',
      })
      expect(keyValue).not.toBe(false)
      if (keyValue !== false) {
        expect(keyValue.password).toBe('"test-value"')
      }
      const walletValue = await KeyChain.getGenericPassword({
        service: 'wallet',
      })
      expect(walletValue).not.toBe(false)
      if (walletValue !== false) {
        expect(JSON.parse(walletValue.password)).toEqual({
          accounts: [],
          password: 'test-password',
          encryptedSecretKey: 'test-encrypted-secret-key',
          salt: 'test-salt',
          rootKey: 'test-root-key',
          configPrivateKey: 'test-config-private-key',
        })
      }
    })
  })

  describe('getItem', () => {
    it('should get an item successfully', async () => {
      await keyChainStorage.setItem('wallet', {
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      })

      await keyChainStorage.setItem('test-key', 'test-value')
      const value = await keyChainStorage.getItem('wallet')
      expect(value).toEqual({
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      })
      const keyValue = await keyChainStorage.getItem('test-key')
      expect(keyValue).toBe('test-value')
    })

    it('should return null when the key does not exist', async () => {
      const value = await keyChainStorage.getItem('non-existent-key')
      expect(value).toBeNull()
    })
  })

  describe('removeItem', () => {
    it('should remove an item successfully', async () => {
      await keyChainStorage.setItem('test-key', 'test-value')
      await keyChainStorage.removeItem('test-key')
      const value = await KeyChain.getGenericPassword({ service: 'test-key' })
      expect(value).toBe(false)
    })
  })

  describe('clear', () => {
    it('should clear the storage successfully', async () => {
      await keyChainStorage.setItem('test-key', 'test-value')
      await keyChainStorage.setItem('wallet', {
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      })
      await keyChainStorage.clear()
      const keyValue = await KeyChain.getGenericPassword({
        service: 'test-key',
      })
      expect(keyValue).toBe(false)
      const walletValue = await KeyChain.getGenericPassword({
        service: 'wallet',
      })
      expect(walletValue).toBe(false)
    })
  })
})
