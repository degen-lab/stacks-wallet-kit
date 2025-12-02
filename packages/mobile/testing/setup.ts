import { TextEncoder, TextDecoder } from 'util'

if (typeof globalThis.TextEncoder === 'undefined') {
  globalThis.TextEncoder = TextEncoder
}

if (typeof globalThis.TextDecoder === 'undefined') {
  globalThis.TextDecoder = TextDecoder as typeof globalThis.TextDecoder
}

import crypto from 'crypto'

if (typeof globalThis.crypto === 'undefined') {
  // @ts-expect-error - crypto is not defined in jsdom environment
  globalThis.crypto = crypto
}

if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = Buffer
}
