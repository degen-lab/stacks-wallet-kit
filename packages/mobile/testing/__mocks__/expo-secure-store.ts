const storage: Record<string, string> = {}

const setItemAsync = jest.fn(
  async (key: string, value: string): Promise<void> => {
    storage[key] = value
  }
)

const getItemAsync = jest.fn(async (key: string): Promise<string | null> => {
  return storage[key] || null
})

const deleteItemAsync = jest.fn(async (key: string): Promise<void> => {
  delete storage[key]
})

const clearMockStorage = (): void => {
  Object.keys(storage).forEach((key) => delete storage[key])
}

export default {
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
  clearMockStorage,
}

export { setItemAsync, getItemAsync, deleteItemAsync, clearMockStorage }
