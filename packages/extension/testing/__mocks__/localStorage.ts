const storage: Record<string, string> = {}

const setItem = jest.fn((key: string, value: string): void => {
  storage[key] = value
})

const getItem = jest.fn((key: string): string | null => {
  return storage[key] || null
})

const removeItem = jest.fn((key: string): void => {
  delete storage[key]
})

const clear = jest.fn((): void => {
  Object.keys(storage).forEach((key) => delete storage[key])
})

const clearMockStorage = (): void => {
  Object.keys(storage).forEach((key) => delete storage[key])
}

const localStorageMock = {
  getItem,
  setItem,
  removeItem,
  clear,
  length: 0,
  key: jest.fn((index: number): string | null => {
    const keys = Object.keys(storage)
    return keys[index] || null
  }),
}

export default localStorageMock
export { setItem, getItem, removeItem, clear, clearMockStorage }
