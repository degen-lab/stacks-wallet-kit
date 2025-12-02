// Mock chrome.storage API for Jest testing
// This file sets up global.chrome before any modules are imported

const mockStorage = {}

global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        const result = {}
        const keysArray = Array.isArray(keys)
          ? keys
          : keys === null
            ? Object.keys(mockStorage)
            : [keys]

        keysArray.forEach((key) => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key]
          }
        })

        callback(result)
      }),
      set: jest.fn((items, callback) => {
        Object.keys(items).forEach((key) => {
          mockStorage[key] = items[key]
        })
        if (callback) callback()
      }),
      remove: jest.fn((keys, callback) => {
        const keysArray = Array.isArray(keys) ? keys : [keys]
        keysArray.forEach((key) => {
          delete mockStorage[key]
        })
        if (callback) callback()
      }),
      clear: jest.fn((callback) => {
        Object.keys(mockStorage).forEach((key) => {
          delete mockStorage[key]
        })
        if (callback) callback()
      }),
    },
  },
  runtime: {
    lastError: null,
  },
  identity: {
    launchWebAuthFlow: jest.fn(),
    getAuthToken: jest.fn((details, callback) => {
      if (callback) callback(null)
    }),
    removeCachedAuthToken: jest.fn((details, callback) => {
      if (callback) callback()
    }),
  },
}

// Export for use in tests if needed
module.exports = { mockStorage }
