import { HDKey } from '@scure/bip32'
import { bech32 } from 'bech32'
import {
  generateSecretKey,
  getBitcoinAddressesFromStacksWallet,
} from '../../../src/stacks/utils/walletHelpers'

describe('getBitcoinAddressesFromStacksWallet', () => {
  // Standard test mnemonic (BIP39 test vector)
  const testMnemonic =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

  let rootKeychain: HDKey

  beforeAll(async () => {
    rootKeychain = await generateSecretKey(testMnemonic, '')
  })

  describe('Address format validation', () => {
    it('should generate valid mainnet Bitcoin address (starts with bc1)', async () => {
      const addresses = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )

      expect(addresses.mainnet).toBeDefined()
      expect(typeof addresses.mainnet).toBe('string')
      expect(addresses.mainnet).toMatch(/^bc1[a-z0-9]{39,59}$/)
    })

    it('should generate valid testnet Bitcoin address (starts with tb1)', async () => {
      const addresses = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )

      expect(addresses.testnet).toBeDefined()
      expect(typeof addresses.testnet).toBe('string')
      expect(addresses.testnet).toMatch(/^tb1[a-z0-9]{39,59}$/)
    })

    it('should generate valid bech32 addresses', async () => {
      const addresses = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )

      // Verify mainnet address is valid bech32
      expect(() => bech32.decode(addresses.mainnet)).not.toThrow()
      const mainnetDecoded = bech32.decode(addresses.mainnet)
      expect(mainnetDecoded.prefix).toBe('bc')
      expect(mainnetDecoded.words.length).toBeGreaterThan(0)

      // Verify testnet address is valid bech32
      expect(() => bech32.decode(addresses.testnet)).not.toThrow()
      const testnetDecoded = bech32.decode(addresses.testnet)
      expect(testnetDecoded.prefix).toBe('tb')
      expect(testnetDecoded.words.length).toBeGreaterThan(0)
    })
  })

  describe('Address uniqueness', () => {
    it('should generate different addresses for different account indices', async () => {
      const addresses0 = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )
      const addresses1 = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        1
      )

      expect(addresses0.mainnet).not.toBe(addresses1.mainnet)
      expect(addresses0.testnet).not.toBe(addresses1.testnet)
    })

    it('should generate different mainnet and testnet addresses for same account', async () => {
      const addresses = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )

      expect(addresses.mainnet).not.toBe(addresses.testnet)
      expect(addresses.mainnet.startsWith('bc1')).toBe(true)
      expect(addresses.testnet.startsWith('tb1')).toBe(true)
    })
  })

  describe('Deterministic behavior', () => {
    it('should generate the same addresses for the same inputs', async () => {
      const addresses1 = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )
      const addresses2 = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )

      expect(addresses1.mainnet).toBe(addresses2.mainnet)
      expect(addresses1.testnet).toBe(addresses2.testnet)
    })

    it('should generate consistent addresses across multiple calls', async () => {
      const results = await Promise.all([
        getBitcoinAddressesFromStacksWallet(rootKeychain, 2),
        getBitcoinAddressesFromStacksWallet(rootKeychain, 2),
        getBitcoinAddressesFromStacksWallet(rootKeychain, 2),
      ])

      const mainnetAddresses = results.map((r) => r.mainnet)
      const testnetAddresses = results.map((r) => r.testnet)

      expect(new Set(mainnetAddresses).size).toBe(1)
      expect(new Set(testnetAddresses).size).toBe(1)
    })
  })

  describe('Multiple account indices', () => {
    it('should generate unique addresses for accounts 0, 1, 2', async () => {
      const addresses0 = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )
      const addresses1 = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        1
      )
      const addresses2 = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        2
      )

      const allMainnet = [
        addresses0.mainnet,
        addresses1.mainnet,
        addresses2.mainnet,
      ]
      const allTestnet = [
        addresses0.testnet,
        addresses1.testnet,
        addresses2.testnet,
      ]

      expect(new Set(allMainnet).size).toBe(3)
      expect(new Set(allTestnet).size).toBe(3)
    })
  })

  describe('Address structure validation', () => {
    it('should return an object with mainnet and testnet properties', async () => {
      const addresses = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )

      expect(addresses).toHaveProperty('mainnet')
      expect(addresses).toHaveProperty('testnet')
      expect(Object.keys(addresses).length).toBe(2)
    })

    it('should generate addresses with correct length (P2WPKH)', async () => {
      const addresses = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )

      // P2WPKH addresses are typically 42 characters (bc1 + 32 bytes encoded in bech32)
      // But can vary slightly, so we check it's within reasonable range
      expect(addresses.mainnet.length).toBeGreaterThanOrEqual(42)
      expect(addresses.mainnet.length).toBeLessThanOrEqual(62)
      expect(addresses.testnet.length).toBeGreaterThanOrEqual(42)
      expect(addresses.testnet.length).toBeLessThanOrEqual(62)
    })
  })

  describe('Edge cases', () => {
    it('should handle account index 0', async () => {
      const addresses = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )

      expect(addresses.mainnet).toMatch(/^bc1/)
      expect(addresses.testnet).toMatch(/^tb1/)
    })

    it('should handle large account indices', async () => {
      const addresses = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        2147483647 // Max int32
      )

      expect(addresses.mainnet).toMatch(/^bc1/)
      expect(addresses.testnet).toMatch(/^tb1/)
    })
  })

  describe('Different mnemonics produce different addresses', () => {
    it('should generate different addresses for different root keychains', async () => {
      const mnemonic2 = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong'
      const rootKeychain2 = await generateSecretKey(mnemonic2, '')

      const addresses1 = await getBitcoinAddressesFromStacksWallet(
        rootKeychain,
        0
      )
      const addresses2 = await getBitcoinAddressesFromStacksWallet(
        rootKeychain2,
        0
      )

      expect(addresses1.mainnet).not.toBe(addresses2.mainnet)
      expect(addresses1.testnet).not.toBe(addresses2.testnet)
    })
  })
})
