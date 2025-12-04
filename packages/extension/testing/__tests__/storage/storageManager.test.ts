import { StorageManager } from '../../../src/storage/storageManager'
import { mockEncrypt, mockDecrypt } from '../../__mocks__/encryption'
import {
  PasswordNotSetError,
  InvalidPasswordError,
} from '@stacks-wallet-kit/core'

interface ChromeMock {
  storage: {
    local: {
      get: jest.Mock
      set: jest.Mock
      remove: jest.Mock
      clear: jest.Mock
    }
  }
  runtime: {
    lastError: { message: string } | null
  }
}

const getChrome = (): ChromeMock => global.chrome as unknown as ChromeMock

describe('Web storage manager unit tests', () => {
  const password = 'test-password'
  let storageManager: StorageManager

  beforeEach(async () => {
    // Clear chrome storage first to ensure clean state
    const { mockStorage } = require('../../__mocks__/chrome')
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])

    jest.clearAllMocks()
    getChrome().runtime.lastError = null
    getChrome().storage.local.clear()
    storageManager = new StorageManager(mockEncrypt, mockDecrypt)
    await storageManager.setPassword(password)
  })

  afterEach(() => {
    // Clear all data after each test to prevent leakage
    const { mockStorage } = require('../../__mocks__/chrome')
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
    getChrome().storage.local.clear()
  })

  describe('setItem', () => {
    it('should set an item successfully', async () => {
      await storageManager.setItem('test-key', 'test-value')

      expect(mockEncrypt).toHaveBeenCalledWith('"test-value"', password)
      expect(getChrome().storage.local.set).toHaveBeenCalledWith(
        { 'test-key': expect.stringContaining('encrypted:') },
        expect.any(Function)
      )

      const stored = await storageManager.getItem('test-key')
      expect(stored).toBe('test-value')
    })

    it('should set an object successfully', async () => {
      const testObject = {
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      }

      await storageManager.setItem('wallet', testObject)

      expect(mockEncrypt).toHaveBeenCalledWith(
        JSON.stringify(testObject),
        password
      )
      const stored = await storageManager.getItem('wallet')
      expect(stored).toEqual(testObject)
    })

    it('should set a number successfully', async () => {
      await storageManager.setItem('balance', 1000)

      expect(mockEncrypt).toHaveBeenCalledWith('1000', password)
      const stored = await storageManager.getItem<number>('balance')
      expect(stored).toBe(1000)
    })

    it('should set a boolean successfully', async () => {
      await storageManager.setItem('isActive', true)

      expect(mockEncrypt).toHaveBeenCalledWith('true', password)
      const stored = await storageManager.getItem<boolean>('isActive')
      expect(stored).toBe(true)
    })

    it('should set null successfully', async () => {
      await storageManager.setItem('null-value', null)

      expect(mockEncrypt).toHaveBeenCalledWith('null', password)
      const stored = await storageManager.getItem('null-value')
      expect(stored).toBeNull()
    })

    it('should handle encryption errors', async () => {
      const errorEncrypt = jest
        .fn()
        .mockRejectedValueOnce(new Error('Encryption failed'))

      const errorStorageManager = new StorageManager(errorEncrypt, mockDecrypt)
      await errorStorageManager.setPassword(password)

      await expect(
        errorStorageManager.setItem('test-key', 'test-value')
      ).rejects.toThrow('Encryption failed')
      const stored = await storageManager.getItem('test-key')
      expect(stored).toBeNull()
    })
  })

  describe('getItem', () => {
    it('should get an item successfully', async () => {
      const testValue = 'test-value'
      await storageManager.setItem('test-key', testValue)

      const value = await storageManager.getItem<string>('test-key')

      expect(mockDecrypt).toHaveBeenCalled()
      expect(value).toBe(testValue)
    })

    it('should get an object successfully', async () => {
      const testObject = {
        accounts: [],
        password: 'test-password',
        encryptedSecretKey: 'test-encrypted-secret-key',
        salt: 'test-salt',
        rootKey: 'test-root-key',
        configPrivateKey: 'test-config-private-key',
      }

      await storageManager.setItem('wallet', testObject)
      const value = await storageManager.getItem<typeof testObject>('wallet')

      expect(value).toEqual(testObject)
    })

    it('should return null when the key does not exist', async () => {
      const value = await storageManager.getItem('non-existent-key')

      expect(value).toBeNull()
      expect(mockDecrypt).not.toHaveBeenCalled()
    })

    it('should return null when chrome.storage returns null', async () => {
      const value = await storageManager.getItem('non-existent-key')

      expect(value).toBeNull()
      expect(mockDecrypt).not.toHaveBeenCalled()
    })

    it('should handle decryption errors', async () => {
      // Create a storage manager with a normal decrypt for setup
      const normalStorageManager = new StorageManager(mockEncrypt, mockDecrypt)
      await normalStorageManager.setPassword(password)
      await normalStorageManager.setItem('test-key', 'test-value')

      // Now create one with a decrypt that works for the first call (password check) but fails for others
      let callCount = 0
      const errorDecrypt = jest
        .fn()
        .mockImplementation(async (encryptedValue: string, pwd: string) => {
          callCount++
          // First call is for password check in setPassword - let it work
          if (callCount === 1) {
            return mockDecrypt(encryptedValue, pwd)
          }
          // Subsequent calls should fail
          throw new Error('Decryption failed')
        })

      const errorStorageManager = new StorageManager(mockEncrypt, errorDecrypt)
      // Set password - this should work because decrypt works for first call
      await errorStorageManager.setPassword(password)

      // Now try to get the item - the decrypt should fail
      await expect(errorStorageManager.getItem('test-key')).rejects.toThrow(
        'Decryption failed'
      )
    })

    it('should handle invalid JSON after decryption', async () => {
      // Create a storage manager with a normal decrypt for setup
      const normalStorageManager = new StorageManager(mockEncrypt, mockDecrypt)
      await normalStorageManager.setPassword(password)
      await normalStorageManager.setItem('test-key', 'test-value')

      // Now create one with a decrypt that works for the first call (password check) but returns invalid JSON for others
      let callCount = 0
      const invalidDecrypt = jest
        .fn()
        .mockImplementation(async (encryptedValue: string, pwd: string) => {
          callCount++
          // First call is for password check in setPassword - let it work
          if (callCount === 1) {
            return mockDecrypt(encryptedValue, pwd)
          }
          // Subsequent calls should return invalid JSON
          return 'invalid-json-{'
        })

      const invalidStorageManager = new StorageManager(
        mockEncrypt,
        invalidDecrypt
      )
      // Set password - this should work because decrypt works for first call
      await invalidStorageManager.setPassword(password)

      // Now try to get it - the decrypt should return invalid JSON
      await expect(invalidStorageManager.getItem('test-key')).rejects.toThrow()
    })

    it('should get a number successfully', async () => {
      await storageManager.setItem('balance', 1000)
      const value = await storageManager.getItem<number>('balance')

      expect(value).toBe(1000)
    })

    it('should get a boolean successfully', async () => {
      await storageManager.setItem('isActive', true)
      const value = await storageManager.getItem<boolean>('isActive')

      expect(value).toBe(true)
    })
  })

  describe('removeItem', () => {
    it('should remove an item successfully', async () => {
      await storageManager.setItem('test-key', 'test-value')
      await storageManager.removeItem('test-key')

      const value = await storageManager.getItem('test-key')
      expect(value).toBeNull()
    })

    it('should remove non-existent item without error', async () => {
      await storageManager.removeItem('non-existent-key')

      const stored = await storageManager.getItem('non-existent-key')
      expect(stored).toBeNull()
    })
  })

  describe('clear', () => {
    it('should clear the storage successfully', async () => {
      await storageManager.setItem('test-key', 'test-value')
      await storageManager.setItem('wallet', {
        accounts: [],
        password: 'test-password',
      })
      await storageManager.clear()

      const value1 = await storageManager.getItem('test-key')
      const value2 = await storageManager.getItem('wallet')
      expect(value1).toBeNull()
      expect(value2).toBeNull()
    })

    it('should clear empty storage without error', async () => {
      await storageManager.clear()

      const stored = await storageManager.getItem('any-key')
      expect(stored).toBeNull()
    })
  })

  describe('Integration scenarios', () => {
    it('should handle full set-get-remove flow', async () => {
      const testData = { key: 'value', number: 42 }

      await storageManager.setItem('data', testData)
      const retrieved = await storageManager.getItem<typeof testData>('data')
      expect(retrieved).toEqual(testData)

      await storageManager.removeItem('data')
      const afterRemove = await storageManager.getItem('data')
      expect(afterRemove).toBeNull()
    })

    it('should handle multiple items independently', async () => {
      await storageManager.setItem('key1', 'value1')
      await storageManager.setItem('key2', 'value2')
      await storageManager.setItem('key3', { data: 'value3' })

      const value1 = await storageManager.getItem<string>('key1')
      const value2 = await storageManager.getItem<string>('key2')
      const value3 = await storageManager.getItem<{ data: string }>('key3')

      expect(value1).toBe('value1')
      expect(value2).toBe('value2')
      expect(value3).toEqual({ data: 'value3' })

      await storageManager.removeItem('key2')

      const afterRemove1 = await storageManager.getItem('key1')
      const afterRemove2 = await storageManager.getItem('key2')
      const afterRemove3 = await storageManager.getItem('key3')

      expect(afterRemove1).toBe('value1')
      expect(afterRemove2).toBeNull()
      expect(afterRemove3).toEqual({ data: 'value3' })
    })

    it('should use correct password for encryption and decryption', async () => {
      // Clear chrome storage to ensure a fresh start for this test
      getChrome().storage.local.clear()

      const customPassword = 'custom-password'
      // Create fresh mocks that actually implement the encryption/decryption logic
      const customEncrypt = jest.fn(
        async (value: string, pwd: string): Promise<string> => {
          return `encrypted:${Buffer.from(value).toString('base64')}:${pwd}`
        }
      )
      const customDecrypt = jest.fn(
        async (encryptedValue: string, pwd: string): Promise<string> => {
          const match = encryptedValue.match(/^encrypted:(.+):(.+)$/)
          if (!match || match[2] !== pwd) {
            throw new Error('Decryption failed')
          }
          return Buffer.from(match[1], 'base64').toString('utf-8')
        }
      )

      const customStorageManager = new StorageManager(
        customEncrypt,
        customDecrypt
      )
      await customStorageManager.setPassword(customPassword)

      await customStorageManager.setItem('test', 'value')

      expect(customEncrypt).toHaveBeenCalledWith('"value"', customPassword)

      const value = await customStorageManager.getItem<string>('test')

      expect(customDecrypt).toHaveBeenCalledWith(
        expect.any(String),
        customPassword
      )
      expect(value).toBe('value')
    })

    it('should handle overwriting existing items', async () => {
      await storageManager.setItem('key', 'value1')
      await storageManager.setItem('key', 'value2')

      const value = await storageManager.getItem<string>('key')
      expect(value).toBe('value2')
    })
  })

  describe('Error handling', () => {
    it('should handle chrome.storage.set errors', async () => {
      const chrome = getChrome()
      chrome.runtime.lastError = {
        message: 'Storage quota exceeded',
      }
      chrome.storage.local.set = jest.fn((items, callback) => {
        if (callback) callback()
      }) as jest.Mock

      await expect(
        storageManager.setItem('test-key', 'test-value')
      ).rejects.toThrow('Storage quota exceeded')
      chrome.runtime.lastError = null
    })

    it('should handle chrome.storage.get errors', async () => {
      const chrome = getChrome()
      chrome.runtime.lastError = {
        message: 'Storage access denied',
      }
      chrome.storage.local.get = jest.fn((keys, callback) => {
        if (callback) callback({})
      }) as jest.Mock

      await expect(storageManager.getItem('test-key')).rejects.toThrow(
        'Storage access denied'
      )
      chrome.runtime.lastError = null
    })

    it('should handle chrome.storage.remove errors', async () => {
      const chrome = getChrome()
      chrome.runtime.lastError = {
        message: 'Remove failed',
      }
      chrome.storage.local.remove = jest.fn((keys, callback) => {
        if (callback) callback()
      }) as jest.Mock

      await expect(storageManager.removeItem('test-key')).rejects.toThrow(
        'Remove failed'
      )
      chrome.runtime.lastError = null
    })

    it('should handle chrome.storage.clear errors', async () => {
      const chrome = getChrome()
      chrome.runtime.lastError = {
        message: 'Clear failed',
      }
      chrome.storage.local.clear = jest.fn((callback) => {
        if (callback) callback()
      }) as jest.Mock

      await expect(storageManager.clear()).rejects.toThrow('Clear failed')
      chrome.runtime.lastError = null
    })
  })
})
