// Mock chrome.storage.local for testing
export const mockChromeStorage: {
  [key: string]: string
} = {}

export const mockChromeStorageAPI = {
  local: {
    get: jest.fn(
      (
        keys: string | string[] | { [key: string]: any } | null,
        callback: (items: { [key: string]: any }) => void
      ) => {
        const result: { [key: string]: any } = {}
        const keysArray = Array.isArray(keys)
          ? keys
          : keys === null
            ? Object.keys(mockChromeStorage)
            : [keys as string]

        keysArray.forEach((key) => {
          if (mockChromeStorage[key]) {
            result[key] = mockChromeStorage[key]
          }
        })

        callback(result)
      }
    ),
    set: jest.fn((items: { [key: string]: any }, callback?: () => void) => {
      Object.keys(items).forEach((key) => {
        mockChromeStorage[key] = items[key]
      })
      if (callback) callback()
    }),
    remove: jest.fn((keys: string | string[], callback?: () => void) => {
      const keysArray = Array.isArray(keys) ? keys : [keys]
      keysArray.forEach((key) => {
        delete mockChromeStorage[key]
      })
      if (callback) callback()
    }),
    clear: jest.fn((callback?: () => void) => {
      Object.keys(mockChromeStorage).forEach((key) => {
        delete mockChromeStorage[key]
      })
      if (callback) callback()
    }),
  },
  runtime: {
    lastError: null as chrome.runtime.LastError | null,
  },
}
