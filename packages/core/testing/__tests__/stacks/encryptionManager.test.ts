import { EncryptionManager } from '../../../src/stacks/manager/encryptionManager'
import {
  InvalidMnemonicError,
  InvalidPasswordError,
  InvalidPasswordOrSaltOrEncryptedWalletError,
} from '../../../src/shared/errors/encryptionErrors'
import { Wallet, WalletEnvelope } from '../../../src/shared'
import { generateSecretKey } from '../../../src/stacks/utils/walletHelpers'

describe('Encryption manager unit tests', () => {
  const encryptionManager = new EncryptionManager()
  const validMnemonic =
    'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

  async function createTestWallet(): Promise<Wallet> {
    const privateKey = await generateSecretKey(validMnemonic, '')
    return {
      privateKey: privateKey.privateExtendedKey,
      createdAt: new Date().toString(),
      accounts: [],
    }
  }

  beforeEach(() => {})
  describe('encryptWallet', () => {
    it('should encrypt the wallet successfully', async () => {
      const wallet = await createTestWallet()

      const result = await encryptionManager.encryptWallet(
        'test-password',
        wallet,
        validMnemonic
      )

      expect(result.salt).toBeDefined()
      expect(result.salt.length).toBeGreaterThan(0) // base64 encoded salt
      expect(result.encryptedWallet).toBeDefined()
      expect(result.encryptedMnemonic).toBeDefined()
      expect(result.mnemonicNonce).toBeDefined()
      expect(result.walletNonce).toBeDefined()
      expect(result.wrappedMasterKey).toBeDefined()
      expect(result.wrapNonce).toBeDefined()
      expect(result.iterations).toBe(1000)
      expect(result.encryptedMnemonic).not.toBe(validMnemonic)
      expect(result.encryptedWallet).not.toBe(JSON.stringify(wallet))
    })

    it('should throw an error if the mnemonic is invalid', async () => {
      const wallet = await createTestWallet()

      const invalidMnemonic = 'invalid-mnemonic'
      await expect(
        encryptionManager.encryptWallet(
          'test-password',
          wallet,
          invalidMnemonic
        )
      ).rejects.toThrow(InvalidMnemonicError)
    })

    it('should throw an error if the password is an empty string', async () => {
      const wallet = await createTestWallet()

      await expect(
        encryptionManager.encryptWallet('', wallet, validMnemonic)
      ).rejects.toThrow(InvalidPasswordError)
    })

    it('should encrypt the wallet successfully with a password that is very long', async () => {
      const wallet = await createTestWallet()

      const result = await encryptionManager.encryptWallet(
        'test-password-that-is-very-long-and-contains-special-characters-and-numbers-and-symbols',
        wallet,
        validMnemonic
      )

      expect(result.salt).toBeDefined()
      expect(result.salt.length).toBeGreaterThan(0) // base64 encoded salt
      expect(result.encryptedWallet).toBeDefined()
      expect(result.encryptedMnemonic).toBeDefined()
      expect(result.mnemonicNonce).toBeDefined()
      expect(result.walletNonce).toBeDefined()
      expect(result.wrappedMasterKey).toBeDefined()
      expect(result.wrapNonce).toBeDefined()
      expect(result.iterations).toBe(1000)
    })
  })

  describe('decryptMnemonic', () => {
    it('should decrypt the mnemonic successfully', async () => {
      const wallet = await createTestWallet()

      const {
        encryptedMnemonic,
        salt,
        wrapNonce,
        wrappedMasterKey,
        mnemonicNonce,
      } = await encryptionManager.encryptWallet(
        'test-password',
        wallet,
        validMnemonic
      )
      const decryptedMnemonic = await encryptionManager.decryptMnemonic(
        'test-password',
        salt,
        wrapNonce,
        wrappedMasterKey,
        mnemonicNonce,
        encryptedMnemonic
      )
      expect(decryptedMnemonic).toBe(validMnemonic)
    })

    it('should throw an error if the password is incorrect', async () => {
      const wallet = await createTestWallet()
      const {
        encryptedMnemonic,
        salt,
        wrapNonce,
        wrappedMasterKey,
        mnemonicNonce,
      } = await encryptionManager.encryptWallet(
        'test-password',
        wallet,
        validMnemonic
      )

      await expect(
        encryptionManager.decryptMnemonic(
          'incorrect-password',
          salt,
          wrapNonce,
          wrappedMasterKey,
          mnemonicNonce,
          encryptedMnemonic
        )
      ).rejects.toThrow(InvalidPasswordOrSaltOrEncryptedWalletError)
    })
    it('should throw an error if the mnemonic is invalid when decrypting', async () => {
      const invalidSalt = Buffer.from('invalid-salt').toString('base64')
      const invalidWrapNonce =
        Buffer.from('invalid-wrap-nonce').toString('base64')
      const invalidWrappedMasterKey =
        Buffer.from('invalid-wrapped-mk').toString('base64')
      const invalidMnemonicNonce = Buffer.from(
        'invalid-mnemonic-nonce'
      ).toString('base64')
      const invalidEncryptedMnemonic = Buffer.from(
        'invalid-encrypted-mnemonic'
      ).toString('base64')

      await expect(
        encryptionManager.decryptMnemonic(
          'test-password',
          invalidSalt,
          invalidWrapNonce,
          invalidWrappedMasterKey,
          invalidMnemonicNonce,
          invalidEncryptedMnemonic
        )
      ).rejects.toThrow()
    })
  })

  describe('decryptWallet', () => {
    it('should decrypt the wallet successfully', async () => {
      const wallet = await createTestWallet()

      const encryptedData = await encryptionManager.encryptWallet(
        'test-password',
        wallet,
        validMnemonic
      )

      const envelope: WalletEnvelope = {
        version: 1,
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonic: encryptedData.encryptedMnemonic,
        mnemonicNonce: encryptedData.mnemonicNonce,
        wallet: encryptedData.encryptedWallet,
        walletNonce: encryptedData.walletNonce,
        accountsCount: wallet.accounts.length,
        salt: encryptedData.salt,
        protection: {
          kdf: {
            name: 'pbkdf2',
            iterations: encryptedData.iterations,
            salt: encryptedData.salt,
          },
          wrappedMasterKey: encryptedData.wrappedMasterKey,
          wrapNonce: encryptedData.wrapNonce,
        },
      }

      const decryptedWallet = await encryptionManager.decryptWallet(
        'test-password',
        envelope
      )
      expect(decryptedWallet.wallet.createdAt).toBe(wallet.createdAt)
      expect(decryptedWallet.wallet.accounts).toEqual(wallet.accounts)
      expect(decryptedWallet.wallet.privateKey).toBe(wallet.privateKey)
      expect(decryptedWallet.mnemonic).toBe(validMnemonic)
    })

    it('should throw an error if the password is incorrect', async () => {
      const wallet = await createTestWallet()

      const encryptedData = await encryptionManager.encryptWallet(
        'test-password',
        wallet,
        validMnemonic
      )

      const envelope: WalletEnvelope = {
        version: 1,
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonic: encryptedData.encryptedMnemonic,
        mnemonicNonce: encryptedData.mnemonicNonce,
        wallet: encryptedData.encryptedWallet,
        walletNonce: encryptedData.walletNonce,
        accountsCount: wallet.accounts.length,
        salt: encryptedData.salt,
        protection: {
          kdf: {
            name: 'pbkdf2',
            iterations: encryptedData.iterations,
            salt: encryptedData.salt,
          },
          wrappedMasterKey: encryptedData.wrappedMasterKey,
          wrapNonce: encryptedData.wrapNonce,
        },
      }

      await expect(
        encryptionManager.decryptWallet('incorrect-password', envelope)
      ).rejects.toThrow(InvalidPasswordOrSaltOrEncryptedWalletError)
    })

    it('should throw an error if the salt is incorrect', async () => {
      const wallet = await createTestWallet()

      const encryptedData = await encryptionManager.encryptWallet(
        'test-password',
        wallet,
        validMnemonic
      )

      const envelope: WalletEnvelope = {
        version: 1,
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonic: encryptedData.encryptedMnemonic,
        mnemonicNonce: encryptedData.mnemonicNonce,
        wallet: encryptedData.encryptedWallet,
        walletNonce: encryptedData.walletNonce,
        accountsCount: wallet.accounts.length,
        salt: 'incorrect-salt',
        protection: {
          kdf: {
            name: 'pbkdf2',
            iterations: encryptedData.iterations,
            salt: 'incorrect-salt',
          },
          wrappedMasterKey: encryptedData.wrappedMasterKey,
          wrapNonce: encryptedData.wrapNonce,
        },
      }

      await expect(
        encryptionManager.decryptWallet('test-password', envelope)
      ).rejects.toThrow(InvalidPasswordOrSaltOrEncryptedWalletError)
    })

    it('should throw an error with the wrong encryped wallet data', async () => {
      const wallet = await createTestWallet()

      const encryptedData = await encryptionManager.encryptWallet(
        'test-password',
        wallet,
        validMnemonic
      )

      const envelope: WalletEnvelope = {
        version: 1,
        walletId: 'test-wallet-id',
        createdAt: new Date(),
        mnemonic: encryptedData.encryptedMnemonic,
        mnemonicNonce: encryptedData.mnemonicNonce,
        wallet: 'invalid-encrypted-wallet',
        walletNonce: encryptedData.walletNonce,
        accountsCount: wallet.accounts.length,
        salt: encryptedData.salt,
        protection: {
          kdf: {
            name: 'pbkdf2',
            iterations: encryptedData.iterations,
            salt: encryptedData.salt,
          },
          wrappedMasterKey: encryptedData.wrappedMasterKey,
          wrapNonce: encryptedData.wrapNonce,
        },
      }

      await expect(
        encryptionManager.decryptWallet('test-password', envelope)
      ).rejects.toThrow()
    })
  })
})
