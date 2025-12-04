import { IStorageManager } from '@stacks-wallet-kit/core'
import * as Store from 'expo-secure-store'
export class SecureStore implements IStorageManager {
  private keys: Set<string> = new Set()

  async setItem<T>(key: string, value: T): Promise<void> {
    const serializedData = JSON.stringify(value)

    await Store.setItemAsync(key, serializedData, {
      keychainService: key,
    })
    this.keys.add(key)
  }

  async getItem<T>(key: string): Promise<T | null> {
    const data = await Store.getItemAsync(key)

    if (!data) return null

    const deserializedData: T = JSON.parse(data)
    return deserializedData
  }

  async removeItem(key: string): Promise<void> {
    await Store.deleteItemAsync(key)
    this.keys.delete(key)
  }

  async clear(): Promise<void> {
    for (const key of this.keys) {
      await Store.deleteItemAsync(key)
    }
    this.keys.clear()
  }
}
