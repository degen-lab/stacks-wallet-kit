import { IStorageManager } from './IStorageManager'

export interface IWebStorageManager extends IStorageManager {
  setPassword(password: string): Promise<void>
  checkEncryptionPasswordMatches(password: string): Promise<boolean>
}
