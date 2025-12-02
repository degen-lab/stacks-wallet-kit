/// <reference types="chrome" />

import { IStorageManager } from '@google-wallet-sdk/core'

export class StorageManager implements IStorageManager {
  constructor(
    private password: string,
    private encrypt: (value: string, password: string) => Promise<string>,
    private decrypt: (value: string, password: string) => Promise<string>
  ) {}

  async setItem<T>(key: string, value: T): Promise<void> {
    const stringValue = JSON.stringify(value)
    const encryptedData = await this.encrypt(stringValue, this.password)

    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ [key]: encryptedData }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }

  async getItem<T>(key: string): Promise<T | null> {
    return new Promise<T | null>((resolve, reject) => {
      chrome.storage.local.get([key], async (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
          return
        }

        const encryptedData = result[key]
        if (!encryptedData) {
          resolve(null)
          return
        }

        try {
          const stringValue = await this.decrypt(encryptedData, this.password)
          const value: T = JSON.parse(stringValue)
          resolve(value)
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  async removeItem(key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.remove([key], () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }

  async clear(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message))
        } else {
          resolve()
        }
      })
    })
  }
}
