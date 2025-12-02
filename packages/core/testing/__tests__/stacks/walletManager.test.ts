import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { WalletManager } from '../../../src/stacks/manager/walletManager'
import { HDKey } from '@scure/bip32'

describe('Wallet manager unit tests', () => {
  const walletManager = new WalletManager()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create a wallet successfully', async () => {
    const { wallet, mnemonic } =
      await walletManager.createWallet('test-password')

    expect(wallet).toBeDefined()
    expect(mnemonic).toBeDefined()
    expect(mnemonic.split(' ').length).toBe(24)
    expect(wallet.privateKey).toBeDefined()
    expect(wallet.createdAt).toBeDefined()
    expect(wallet.accounts).toHaveLength(1)
    expect(wallet.accounts[0]).toMatchObject({
      index: 0,
      publicKey: expect.any(String),
      addresses: {
        mainnet: expect.any(String),
        testnet: expect.any(String),
      },
    })
    expect(wallet.accounts[0].addresses.mainnet).toMatch(/^SP[0-9A-Z]{39}$/)
    expect(wallet.accounts[0].addresses.testnet).toMatch(/^ST[0-9A-Z]{39}$/)
  })

  it('should add an account to the wallet', async () => {
    const { wallet } = await walletManager.createWallet('test-password')
    const initialAccountCount = wallet.accounts.length

    const updatedWallet = walletManager.createAccount(wallet)

    expect(updatedWallet.accounts).toHaveLength(initialAccountCount + 1)
    expect(updatedWallet.accounts[1]).toMatchObject({
      index: 1,
      publicKey: expect.any(String),
      addresses: {
        mainnet: expect.any(String),
        testnet: expect.any(String),
      },
    })
    expect(updatedWallet.accounts[1].addresses.mainnet).not.toBe(
      updatedWallet.accounts[0].addresses.mainnet
    )
    expect(updatedWallet.accounts[1].addresses.testnet).not.toBe(
      updatedWallet.accounts[0].addresses.testnet
    )
  })

  it('should create multiple accounts with sequential indices', async () => {
    const { wallet } = await walletManager.createWallet('test-password')
    const walletWithSecondAccount = walletManager.createAccount(wallet)
    const walletWithThirdAccount = walletManager.createAccount(
      walletWithSecondAccount
    )
    expect(walletWithThirdAccount.accounts).toHaveLength(3)
    expect(walletWithThirdAccount.accounts[0].index).toBe(0)
    expect(walletWithThirdAccount.accounts[1].index).toBe(1)
    expect(walletWithThirdAccount.accounts[2].index).toBe(2)
  })

  describe('Mnemonic validation', () => {
    it('should generate a valid BIP39 mnemonic', async () => {
      const { mnemonic } = await walletManager.createWallet('test-password')

      expect(validateMnemonic(mnemonic, wordlist)).toBe(true)
      expect(mnemonic.split(' ').length).toBe(24)
    })

    it('should generate unique mnemonics for each wallet', async () => {
      const { mnemonic: mnemonic1 } =
        await walletManager.createWallet('test-password')
      const { mnemonic: mnemonic2 } =
        await walletManager.createWallet('test-password')
      const { mnemonic: mnemonic3 } =
        await walletManager.createWallet('test-password')

      expect(mnemonic1).not.toBe(mnemonic2)
      expect(mnemonic2).not.toBe(mnemonic3)
      expect(mnemonic1).not.toBe(mnemonic3)
    })

    it('should generate mnemonic with valid BIP39 words', async () => {
      const { mnemonic } = await walletManager.createWallet('test-password')
      const words = mnemonic.split(' ')

      words.forEach((word) => {
        expect(wordlist.includes(word)).toBe(true)
      })
    })

    it('should generate mnemonic in lowercase format', async () => {
      const { mnemonic } = await walletManager.createWallet('test-password')
      const words = mnemonic.split(' ')

      words.forEach((word) => {
        expect(word).toBe(word.toLowerCase())
      })
    })
  })

  describe('Wallet uniqueness', () => {
    it('should create different wallets with different passwords', async () => {
      const { wallet: wallet1 } = await walletManager.createWallet('password1')
      const { wallet: wallet2 } = await walletManager.createWallet('password2')

      expect(wallet1.accounts[0].addresses.mainnet).not.toBe(
        wallet2.accounts[0].addresses.mainnet
      )
      expect(wallet1.accounts[0].addresses.testnet).not.toBe(
        wallet2.accounts[0].addresses.testnet
      )
    })

    it('should create different wallets with same password (random mnemonic)', async () => {
      const { wallet: wallet1 } =
        await walletManager.createWallet('same-password')
      const { wallet: wallet2 } =
        await walletManager.createWallet('same-password')

      expect(wallet1.accounts[0].addresses.mainnet).not.toBe(
        wallet2.accounts[0].addresses.mainnet
      )
      expect(wallet1.accounts[0].publicKey).not.toBe(
        wallet2.accounts[0].publicKey
      )
    })

    it('should create wallets with unique addresses', async () => {
      const wallets = await Promise.all([
        walletManager.createWallet('password1'),
        walletManager.createWallet('password2'),
        walletManager.createWallet('password3'),
      ])

      const addresses = wallets.map(
        (w) => w.wallet.accounts[0].addresses.mainnet
      )
      const uniqueAddresses = new Set(addresses)

      expect(uniqueAddresses.size).toBe(3)
    })
  })

  describe('Wallet structure validation', () => {
    it('should have privateKey as string (extended key)', async () => {
      const { wallet } = await walletManager.createWallet('test-password')

      expect(typeof wallet.privateKey).toBe('string')
      expect(wallet.privateKey).toMatch(/^xprv/)
      // Verify it can be parsed back to HDKey
      const restoredKey = HDKey.fromExtendedKey(wallet.privateKey)
      expect(restoredKey.privateExtendedKey).toBe(wallet.privateKey)
    })

    it('should have createdAt as valid date string', async () => {
      const { wallet } = await walletManager.createWallet('test-password')

      expect(wallet.createdAt).toBeDefined()
      expect(typeof wallet.createdAt).toBe('string')
      expect(new Date(wallet.createdAt).toString()).not.toBe('Invalid Date')
    })

    it('should have all required wallet properties', async () => {
      const { wallet } = await walletManager.createWallet('test-password')

      expect(wallet).toHaveProperty('privateKey')
      expect(wallet).toHaveProperty('createdAt')
      expect(wallet).toHaveProperty('accounts')
      expect(Array.isArray(wallet.accounts)).toBe(true)
    })
  })

  describe('Account uniqueness', () => {
    it('should generate unique public keys for each account', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      const walletWithSecondAccount = walletManager.createAccount(wallet)
      const walletWithThirdAccount = walletManager.createAccount(
        walletWithSecondAccount
      )

      const publicKeys = walletWithThirdAccount.accounts.map(
        (acc) => acc.publicKey
      )
      const uniquePublicKeys = new Set(publicKeys)

      expect(uniquePublicKeys.size).toBe(3)
    })

    it('should generate unique mainnet addresses for each account', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      const walletWithSecondAccount = walletManager.createAccount(wallet)
      const walletWithThirdAccount = walletManager.createAccount(
        walletWithSecondAccount
      )

      const addresses = walletWithThirdAccount.accounts.map(
        (acc) => acc.addresses.mainnet
      )
      const uniqueAddresses = new Set(addresses)

      expect(uniqueAddresses.size).toBe(3)
    })

    it('should generate unique testnet addresses for each account', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      const walletWithSecondAccount = walletManager.createAccount(wallet)
      const walletWithThirdAccount = walletManager.createAccount(
        walletWithSecondAccount
      )

      const addresses = walletWithThirdAccount.accounts.map(
        (acc) => acc.addresses.testnet
      )
      const uniqueAddresses = new Set(addresses)

      expect(uniqueAddresses.size).toBe(3)
    })

    it('should generate valid public key format', async () => {
      const { wallet } = await walletManager.createWallet('test-password')

      expect(wallet.accounts[0].publicKey).toMatch(/^[0-9a-f]{66}$/i)
    })
  })

  describe('Account creation edge cases', () => {
    it('should not mutate original wallet when creating account', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      const originalAccountCount = wallet.accounts.length
      const originalAccounts = [...wallet.accounts]

      walletManager.createAccount(wallet)

      expect(wallet.accounts).toHaveLength(originalAccountCount)
      expect(wallet.accounts).toEqual(originalAccounts)
    })

    it('should preserve existing accounts when adding new one', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      const originalAddress = wallet.accounts[0].addresses.mainnet
      const originalPublicKey = wallet.accounts[0].publicKey

      const updatedWallet = walletManager.createAccount(wallet)

      expect(updatedWallet.accounts[0].addresses.mainnet).toBe(originalAddress)
      expect(updatedWallet.accounts[0].publicKey).toBe(originalPublicKey)
      expect(updatedWallet.accounts[0].index).toBe(0)
    })

    it('should create many accounts successfully', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      let currentWallet = wallet

      for (let i = 1; i <= 10; i++) {
        currentWallet = walletManager.createAccount(currentWallet)
        expect(currentWallet.accounts).toHaveLength(i + 1)
        expect(currentWallet.accounts[i].index).toBe(i)
      }
    })

    it('should maintain sequential account indices', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      let currentWallet = wallet

      for (let i = 0; i < 5; i++) {
        currentWallet = walletManager.createAccount(currentWallet)
      }

      currentWallet.accounts.forEach((account, index) => {
        expect(account.index).toBe(index)
      })
    })
  })

  describe('Password handling', () => {
    it('should handle empty password', async () => {
      const { wallet, mnemonic } = await walletManager.createWallet('')

      expect(wallet).toBeDefined()
      expect(mnemonic).toBeDefined()
      expect(validateMnemonic(mnemonic, wordlist)).toBe(true)
    })

    it('should handle very long password', async () => {
      const longPassword = 'a'.repeat(1000)
      const { wallet, mnemonic } =
        await walletManager.createWallet(longPassword)

      expect(wallet).toBeDefined()
      expect(mnemonic).toBeDefined()
      expect(validateMnemonic(mnemonic, wordlist)).toBe(true)
    })

    it('should handle special characters in password', async () => {
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      const { wallet, mnemonic } =
        await walletManager.createWallet(specialPassword)

      expect(wallet).toBeDefined()
      expect(mnemonic).toBeDefined()
      expect(validateMnemonic(mnemonic, wordlist)).toBe(true)
    })

    it('should handle unicode characters in password', async () => {
      const unicodePassword = '密码🔐пароль'
      const { wallet, mnemonic } =
        await walletManager.createWallet(unicodePassword)

      expect(wallet).toBeDefined()
      expect(mnemonic).toBeDefined()
      expect(validateMnemonic(mnemonic, wordlist)).toBe(true)
    })
  })

  describe('Wallet properties consistency', () => {
    it('should maintain same privateKey across all accounts', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      const walletWithSecondAccount = walletManager.createAccount(wallet)
      const walletWithThirdAccount = walletManager.createAccount(
        walletWithSecondAccount
      )

      expect(walletWithThirdAccount.privateKey).toBe(wallet.privateKey)
      expect(typeof walletWithThirdAccount.privateKey).toBe('string')
      expect(typeof wallet.privateKey).toBe('string')
    })

    it('should maintain same createdAt when adding accounts', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      const originalCreatedAt = wallet.createdAt
      const walletWithAccount = walletManager.createAccount(wallet)

      expect(walletWithAccount.createdAt).toBe(originalCreatedAt)
    })

    it('should maintain account order', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      let currentWallet = wallet

      for (let i = 1; i <= 5; i++) {
        currentWallet = walletManager.createAccount(currentWallet)
      }

      currentWallet.accounts.forEach((account, index) => {
        expect(account.index).toBe(index)
      })
    })
  })

  describe('Network address validation', () => {
    it('should generate valid mainnet addresses', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      let currentWallet = wallet

      for (let i = 0; i < 5; i++) {
        currentWallet.accounts.forEach((account) => {
          expect(account.addresses.mainnet).toMatch(/^SP[0-9A-Z]{39}$/)
        })
        currentWallet = walletManager.createAccount(currentWallet)
      }
    })

    it('should generate valid testnet addresses', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      let currentWallet = wallet

      for (let i = 0; i < 5; i++) {
        currentWallet.accounts.forEach((account) => {
          expect(account.addresses.testnet).toMatch(/^ST[0-9A-Z]{39}$/)
        })
        currentWallet = walletManager.createAccount(currentWallet)
      }
    })

    it('should generate different addresses for mainnet and testnet', async () => {
      const { wallet } = await walletManager.createWallet('test-password')

      wallet.accounts.forEach((account) => {
        expect(account.addresses.mainnet).not.toBe(account.addresses.testnet)
        expect(account.addresses.mainnet.startsWith('SP')).toBe(true)
        expect(account.addresses.testnet.startsWith('ST')).toBe(true)
      })
    })
  })

  describe('Integration scenarios', () => {
    it('should handle full wallet creation and account addition flow', async () => {
      const { wallet, mnemonic } =
        await walletManager.createWallet('test-password')

      expect(validateMnemonic(mnemonic, wordlist)).toBe(true)
      expect(wallet.accounts).toHaveLength(1)

      const walletWithSecondAccount = walletManager.createAccount(wallet)
      expect(walletWithSecondAccount.accounts).toHaveLength(2)
      expect(walletWithSecondAccount.accounts[1].index).toBe(1)

      const walletWithThirdAccount = walletManager.createAccount(
        walletWithSecondAccount
      )
      expect(walletWithThirdAccount.accounts).toHaveLength(3)
      expect(walletWithThirdAccount.accounts[2].index).toBe(2)

      // Verify all accounts have unique addresses
      const mainnetAddresses = walletWithThirdAccount.accounts.map(
        (acc) => acc.addresses.mainnet
      )
      const testnetAddresses = walletWithThirdAccount.accounts.map(
        (acc) => acc.addresses.testnet
      )

      expect(new Set(mainnetAddresses).size).toBe(3)
      expect(new Set(testnetAddresses).size).toBe(3)
    })

    it('should maintain wallet consistency across multiple account additions', async () => {
      const { wallet } = await walletManager.createWallet('test-password')
      const originalPrivateKey = wallet.privateKey
      const originalCreatedAt = wallet.createdAt
      let currentWallet = wallet

      for (let i = 1; i <= 10; i++) {
        currentWallet = walletManager.createAccount(currentWallet)
        expect(currentWallet.privateKey).toBe(originalPrivateKey)
        expect(currentWallet.createdAt).toBe(originalCreatedAt)
        expect(currentWallet.accounts).toHaveLength(i + 1)
      }
    })
  })

  describe('createExistingWallet', () => {
    const validMnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

    it('should create a wallet from existing mnemonic successfully', async () => {
      const wallet = await walletManager.createExistingWallet(validMnemonic)

      expect(wallet).toBeDefined()
      expect(typeof wallet.privateKey).toBe('string')
      expect(wallet.privateKey).toMatch(/^xprv/)
      expect(wallet.createdAt).toBeDefined()
      expect(wallet.accounts).toHaveLength(1)
      expect(wallet.accounts[0]).toMatchObject({
        index: 0,
        publicKey: expect.any(String),
        addresses: {
          mainnet: expect.any(String),
          testnet: expect.any(String),
        },
      })
      expect(wallet.accounts[0].addresses.mainnet).toMatch(/^SP[0-9A-Z]{39}$/)
      expect(wallet.accounts[0].addresses.testnet).toMatch(/^ST[0-9A-Z]{39}$/)
    })

    it('should create wallet without passphrase (empty string)', async () => {
      const wallet = await walletManager.createExistingWallet(validMnemonic)

      expect(wallet).toBeDefined()
      expect(wallet.accounts).toHaveLength(1)
      expect(wallet.accounts[0].publicKey).toMatch(/^[0-9a-f]{66}$/i)
    })

    it('should create wallet with passphrase', async () => {
      const passphrase = 'test-passphrase'
      const walletWithPassphrase = await walletManager.createExistingWallet(
        validMnemonic,
        passphrase
      )

      expect(walletWithPassphrase).toBeDefined()
      expect(walletWithPassphrase.accounts).toHaveLength(1)

      // Wallet with passphrase should be different from wallet without
      const walletWithoutPassphrase =
        await walletManager.createExistingWallet(validMnemonic)
      expect(walletWithPassphrase.accounts[0].addresses.mainnet).not.toBe(
        walletWithoutPassphrase.accounts[0].addresses.mainnet
      )
    })

    it('should create same wallet with same mnemonic and passphrase', async () => {
      const passphrase = 'test-passphrase'
      const wallet1 = await walletManager.createExistingWallet(
        validMnemonic,
        passphrase
      )
      const wallet2 = await walletManager.createExistingWallet(
        validMnemonic,
        passphrase
      )

      expect(wallet1.accounts[0].addresses.mainnet).toBe(
        wallet2.accounts[0].addresses.mainnet
      )
      expect(wallet1.accounts[0].addresses.testnet).toBe(
        wallet2.accounts[0].addresses.testnet
      )
      expect(wallet1.accounts[0].publicKey).toBe(wallet2.accounts[0].publicKey)
    })

    it('should create different wallets with different passphrases', async () => {
      const wallet1 = await walletManager.createExistingWallet(
        validMnemonic,
        'passphrase1'
      )
      const wallet2 = await walletManager.createExistingWallet(
        validMnemonic,
        'passphrase2'
      )

      expect(wallet1.accounts[0].addresses.mainnet).not.toBe(
        wallet2.accounts[0].addresses.mainnet
      )
      expect(wallet1.accounts[0].publicKey).not.toBe(
        wallet2.accounts[0].publicKey
      )
    })

    it('should handle undefined passphrase as empty string', async () => {
      const wallet1 = await walletManager.createExistingWallet(validMnemonic)
      const wallet2 = await walletManager.createExistingWallet(
        validMnemonic,
        undefined
      )

      expect(wallet1.accounts[0].addresses.mainnet).toBe(
        wallet2.accounts[0].addresses.mainnet
      )
    })

    it('should create wallet with 12-word mnemonic', async () => {
      const mnemonic12 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
      const wallet = await walletManager.createExistingWallet(mnemonic12)

      expect(wallet).toBeDefined()
      expect(wallet.accounts).toHaveLength(1)
    })

    it('should create wallet with 24-word mnemonic', async () => {
      const mnemonic24 =
        'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art'
      const wallet = await walletManager.createExistingWallet(mnemonic24)

      expect(wallet).toBeDefined()
      expect(wallet.accounts).toHaveLength(1)
    })

    it('should have correct wallet structure', async () => {
      const wallet = await walletManager.createExistingWallet(validMnemonic)

      expect(wallet).toHaveProperty('privateKey')
      expect(wallet).toHaveProperty('createdAt')
      expect(wallet).toHaveProperty('accounts')
      expect(Array.isArray(wallet.accounts)).toBe(true)
      expect(wallet.accounts[0]).toHaveProperty('index')
      expect(wallet.accounts[0]).toHaveProperty('publicKey')
      expect(wallet.accounts[0]).toHaveProperty('addresses')
      expect(wallet.accounts[0].addresses).toHaveProperty('mainnet')
      expect(wallet.accounts[0].addresses).toHaveProperty('testnet')
    })

    it('should generate valid addresses for both networks', async () => {
      const wallet = await walletManager.createExistingWallet(validMnemonic)

      expect(wallet.accounts[0].addresses.mainnet).toMatch(/^SP[0-9A-Z]{39}$/)
      expect(wallet.accounts[0].addresses.testnet).toMatch(/^ST[0-9A-Z]{39}$/)
      expect(wallet.accounts[0].addresses.mainnet).not.toBe(
        wallet.accounts[0].addresses.testnet
      )
    })

    it('should create wallet that can have accounts added', async () => {
      const wallet = await walletManager.createExistingWallet(validMnemonic)
      const walletWithAccount = walletManager.createAccount(wallet)

      expect(walletWithAccount.accounts).toHaveLength(2)
      expect(walletWithAccount.accounts[1].index).toBe(1)
      expect(walletWithAccount.accounts[0].addresses.mainnet).toBe(
        wallet.accounts[0].addresses.mainnet
      )
    })

    it('should match wallet created with createWallet when using same mnemonic and password', async () => {
      // Create wallet with createWallet
      const { wallet: createdWallet, mnemonic } =
        await walletManager.createWallet('test-password')

      // Recreate same wallet with createExistingWallet using same mnemonic and password
      const recreatedWallet = await walletManager.createExistingWallet(
        mnemonic,
        'test-password'
      )

      expect(recreatedWallet.accounts[0].addresses.mainnet).toBe(
        createdWallet.accounts[0].addresses.mainnet
      )
      expect(recreatedWallet.accounts[0].addresses.testnet).toBe(
        createdWallet.accounts[0].addresses.testnet
      )
      expect(recreatedWallet.accounts[0].publicKey).toBe(
        createdWallet.accounts[0].publicKey
      )
    })
  })
})
