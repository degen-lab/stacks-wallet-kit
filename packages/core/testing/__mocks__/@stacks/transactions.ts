import { NetworkType } from '../../../src'

export const broadcastTransaction = jest.fn()
export const makeContractCall = jest.fn()
export const makeSTXTokenTransfer = jest.fn()
export const standardPrincipalCV = jest.fn()
export const uintCV = jest.fn()
export const bufferCV = jest.fn()
export const noneCV = jest.fn()
export const someCV = jest.fn()
export const tupleCV = jest.fn()
export const principalCV = jest.fn()
export const PostConditionMode = {
  Allow: 'Allow',
  Deny: 'Deny',
}
export const compressPrivateKey = jest.fn((key: Uint8Array) => {
  // Mock implementation: return hex string representation
  return Array.from(key)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
})
export const privateKeyToPublic = jest.fn((privateKey: string) => {
  // Mock implementation: return a mock public key that varies based on privateKey
  // Create a deterministic but varied public key from the private key
  const hash = privateKey
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const publicKeyHex =
    '02' + hash.toString(16).padStart(64, '0').substring(0, 64)
  return {
    toString: () => publicKeyHex,
  }
})
export const publicKeyToHex = jest.fn(
  (publicKey: { toString: () => string } | string) => {
    // Mock implementation: if it's an object with toString, use that, otherwise return as-is
    if (typeof publicKey === 'string') {
      return publicKey
    }
    return publicKey.toString()
  }
)
export const publicKeyToAddressSingleSig = jest.fn(
  (publicKey: string, network: NetworkType) => {
    // Mock implementation: return a mock address based on network
    // Use the public key to generate a deterministic but varied address
    const prefix = network === NetworkType.Mainnet ? 'SP' : 'ST'
    // Generate a mock address with correct length (39 chars after prefix)
    // Use a hash-like approach to make addresses vary based on publicKey
    const hash = publicKey
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    // Create a base36-like string from the hash to ensure valid characters
    const base36Chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    let addressSuffix = ''
    let num = Math.abs(hash)
    // Generate 39 characters, using the hash and publicKey for variation
    const seed = publicKey
      .split('')
      .reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 0)
    for (let i = 0; i < 39; i++) {
      addressSuffix += base36Chars[(num + seed + i) % 36]
      num = Math.floor(num / 36) || Math.abs(seed + i)
    }
    return `${prefix}${addressSuffix}`
  }
)
