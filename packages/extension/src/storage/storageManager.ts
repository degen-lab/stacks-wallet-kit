/// <reference types="chrome" />

import {
  IWebStorageManager,
  PasswordNotSetError,
  InvalidPasswordError,
} from '@degenlab/stacks-wallet-kit-core'

export class StorageManager implements IWebStorageManager {
  private password?: string

  constructor(
    private encrypt: (value: string, password: string) => Promise<string>,
    private decrypt: (value: string, password: string) => Promise<string>
  ) {}

  async setPassword(password: string): Promise<void> {
    try {
      const trimmedPassword = password.trim()
      // Temporarily set password to try decryption
      this.password = trimmedPassword

      // Try to get stored password - this will:
      // 1. Return null if no password exists (first time) -> we'll store it
      // 2. Successfully decrypt if password is correct -> validation passed
      // 3. Throw error if password is wrong -> caught below
      const storedPassword = await this.getItem<string>('password')

      if (!storedPassword) {
        // No password stored yet, store it
        await this.setItem('password', trimmedPassword)
      }
      // If storedPassword exists, password is valid and this.password is already set
    } catch {
      // Decryption failed - wrong password
      this.password = undefined
      throw new InvalidPasswordError()
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    if (!this.password) {
      throw new PasswordNotSetError()
    }
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
    if (!this.password) {
      throw new PasswordNotSetError()
    }
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
          if (!this.password) {
            throw new PasswordNotSetError()
          }
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

  async checkEncryptionPasswordMatches(password: string): Promise<boolean> {
    const storedPassword = await this.getItem<string>('password')

    if (!this.password || !storedPassword) {
      throw new PasswordNotSetError()
    }
    return this.password === password.trim()
  }
}
