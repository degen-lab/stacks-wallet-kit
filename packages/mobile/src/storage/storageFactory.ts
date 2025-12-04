import { IStorageManager } from '@stacks-wallet-kit/core'
import { KeyChainStorage } from './keyChainStorage'
import { SecureStore } from './secureStore'

export class StorageFactory {
  static getInstance(): IStorageManager {
    if (this.isExpo()) {
      return new SecureStore()
    }
    return new KeyChainStorage()
  }

  private static isExpo(): boolean {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('expo-constants')
      return true
    } catch {
      return false
    }
  }
}
