import { mockChromeStorageAPI } from './__mocks__/chromeStorage'

// Setup chrome global before any modules are imported
;(global as any).chrome = mockChromeStorageAPI
if (typeof window !== 'undefined') {
  ;(window as any).chrome = mockChromeStorageAPI
}
