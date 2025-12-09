import { IStorageManager } from '@degenlab/stacks-wallet-kit-core'
import * as KeyChain from 'react-native-keychain'

export class KeyChainStorage implements IStorageManager {
  private keys: Set<string> = new Set()

  async setItem<T>(key: string, value: T): Promise<void> {
    const serializedData = JSON.stringify(value)
    await KeyChain.setGenericPassword(key, serializedData, {
      service: key,
      accessible: KeyChain.ACCESSIBLE.WHEN_UNLOCKED,
    })
    this.keys.add(key)
  }

  async getItem<T>(key: string): Promise<T | null> {
    const data = await KeyChain.getGenericPassword({ service: key })
    if (!data) {
      return null
    }
    const deserializedData: T = JSON.parse(data.password)
    return deserializedData
  }

  async removeItem(key: string): Promise<void> {
    await KeyChain.resetGenericPassword({ service: key })
    this.keys.delete(key)
  }

  async clear(): Promise<void> {
    for (const key of this.keys) {
      await KeyChain.resetGenericPassword({ service: key })
    }
    this.keys.clear()
  }
}
