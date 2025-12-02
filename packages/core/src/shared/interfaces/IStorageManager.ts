export interface IStorageManager {
  setItem<T>(key: string, value: T): Promise<void>
  getItem<T>(key: string): Promise<T | null>
  removeItem(key: string): Promise<void>
  clear(): Promise<void>
}
