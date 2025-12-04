import {
  IAuthentication,
  IBackupManager,
  InvalidAmountError,
  InvalidLockPeriod,
  IStackingClient,
  IStacksClient,
  IStorageManager,
  IWalletManager,
  MaxAmountGreaterThanBalanceError,
  MaxAmountSmallerThanAmountError,
  MinimumThresholdNotMetError,
  NetworkType,
  Wallet,
  WalletAccount,
  WalletEnvelope,
} from '../shared'
import { WalletNotStoredError } from '../shared/errors/SDKError'
import { IEncryptionManager } from '../shared/interfaces/IEncryption'
import { ISDKFacade } from '../shared/interfaces/ISDKFacade'
import { AccessTokenError } from '../shared/errors/backupErrors'
import { InvalidMnemonicError } from '../shared/errors/encryptionErrors'
import {
  derivePrivateKey,
  getBitcoinAddressesFromStacksWallet,
  getFingerPrintFromMnemonic,
} from '../stacks/index'
import { StackingPool } from '../stacks/utils/types'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { HDKey } from '@scure/bip32'
import { ClarityValue, PostConditionMode } from '@stacks/transactions'

export class BaseClient implements ISDKFacade {
  constructor(
    protected authenticationManager: IAuthentication,
    protected backupManager: IBackupManager,
    protected walletManager: IWalletManager,
    protected encryptionManager: IEncryptionManager,
    protected storageManager: IStorageManager,
    protected stacksClient: IStacksClient,
    protected stackingClient: IStackingClient
  ) {}

  /**
   * Make a contract call to the Stacks network
   * @param contractAddress - The address of the contract to call
   * @param functionName - The name of the function to call
   * @param functionArgs - The arguments to pass to the function
   * @param postConditionMode - Optional post condition mode (defaults to PostConditionMode.Deny)
   * @returns The transaction ID of the contract call
   */
  async makeContractCall(
    contractAddress: string,
    functionName: string,
    functionArgs: ClarityValue[],
    postConditionMode?: PostConditionMode
  ): Promise<string> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }
    const senderKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      0
    )
    const [address, contractName] = contractAddress.split('.')
    return await this.stacksClient.makeContractCall(
      address,
      contractName,
      functionName,
      functionArgs,
      senderKey,
      postConditionMode
    )
  }

  /**
   * Create a new account in the wallet
   * @returns The new account
   */
  async createAccount(): Promise<WalletAccount> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }
    const updatedWallet = this.walletManager.createAccount(wallet)
    await this.storageManager.setItem('wallet', updatedWallet)
    return updatedWallet.accounts[updatedWallet.accounts.length - 1]
  }

  /**
   * Store an existing wallet in the local storage
   * @param mnemonic - The mnemonic of the wallet
   * @param passphrase - Optional passphrase for the wallet
   * @returns The wallet
   */
  async storeExistingWallet(
    mnemonic: string,
    passphrase?: string
  ): Promise<Wallet> {
    if (!validateMnemonic(mnemonic, wordlist)) {
      throw new InvalidMnemonicError()
    }
    const wallet = await this.walletManager.createExistingWallet(
      mnemonic,
      passphrase
    )
    await this.storageManager.setItem<Wallet>('wallet', wallet)
    await this.storageManager.setItem<string>('mnemonic', mnemonic)
    return wallet
  }

  /**
   * Set the network for the stacks operations
   * @param network - The network to set
   */
  setNetwork(network: NetworkType): void {
    this.stacksClient.setNetwork(network)
    this.stackingClient.setNetwork(network)
  }

  /**
   * Revoke delegation from a stacking pool
   * @param account - The account to revoke delegation from
   * @returns The transaction ID of the revocation
   */
  async revokeDelegation(account: WalletAccount): Promise<string> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }

    const senderKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      account.index
    )
    const txid = await this.stackingClient.revokeDelegation(senderKey)
    return txid
  }

  /**
   * Delegate STX to a stacking pool
   * @param account - The account to delegate STX from
   * @param amount - The amount of STX to delegate
   * @param delegateTo - The pool to delegate to
   * @param untilBurnHeight - The height at which to stop delegating
   * @returns The transaction ID of the delegation
   */
  async delegateSTX(
    account: WalletAccount,
    amount: number,
    delegateTo: StackingPool,
    untilBurnHeight?: number
  ): Promise<string> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }
    const senderKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      account.index
    )
    const btcAddresses = await getBitcoinAddressesFromStacksWallet(
      HDKey.fromExtendedKey(wallet.privateKey),
      account.index
    )
    const txid = await this.stackingClient.delegateStx(
      senderKey,
      delegateTo,
      amount,
      {
        untilBurnHeight,
        btcAddresses,
      }
    )
    return txid
  }

  /**
   * Increase the stacking of an account
   * @param account - The account to increase stacking for
   * @param increaseBy - The amount of STX to increase stacking by
   * @param maxAmount - The maximum amount of STX to increase stacking by
   * @param currentLockPeriod - The current lock period
   * @param options - The options for the STX stacking if not provided, the signature options will be generated by a dedicated backend service for mainnet and testnet networks.
   * @param options.signerSignature - The signature of the signer (optional)
   * @param options.signerKey - The key of the signer (optional)
   * @param options.authId - The auth ID of the signer (optional)
   * @returns The transaction ID of the stacking increase
   */
  async stackIncrease(
    account: WalletAccount,
    increaseBy: number,
    maxAmount: number,
    currentLockPeriod: number,
    options?: {
      signerSignature: string
      signerKey: string
      authId: string
    }
  ): Promise<string> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }
    const { currentRewardCycle } = await this.stacksClient.getPoxData()
    const senderKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      account.index
    )
    const btcAddresses = await getBitcoinAddressesFromStacksWallet(
      HDKey.fromExtendedKey(wallet.privateKey),
      account.index
    )
    const txid = await this.stackingClient.stackIncrease(
      senderKey,
      currentRewardCycle,
      btcAddresses,
      increaseBy,
      maxAmount,
      currentLockPeriod,
      options
    )
    return txid
  }

  /**
   * Extend the stacking of an account
   * @param account - The account to extend stacking for
   * @param extendCount - The number of cycles to extend stacking for
   * @param maxAmount - The maximum amount of STX to extend stacking by
   * @param options - The options for the STX stacking if not provided, the signature options will be generated by a dedicated backend service for mainnet and testnet networks.
   * @param options.signerSignature - The signature of the signer (optional)
   * @param options.signerKey - The key of the signer (optional)
   * @param options.authId - The auth ID of the signer (optional)
   * @returns The transaction ID of the stacking extension
   */
  async stackExtend(
    account: WalletAccount,
    extendCount: number,
    maxAmount: number,
    options?: {
      signerSignature: string
      signerKey: string
      authId: string
    }
  ): Promise<string> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }
    const { currentRewardCycle } = await this.stacksClient.getPoxData()
    const senderKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      account.index
    )
    const btcAddresses = await getBitcoinAddressesFromStacksWallet(
      HDKey.fromExtendedKey(wallet.privateKey),
      account.index
    )
    const txid = await this.stackingClient.stackExtend(
      senderKey,
      currentRewardCycle,
      extendCount,
      btcAddresses,
      maxAmount,
      options
    )
    return txid
  }

  /**
   * Send STX to an address
   * @param accountIndex - The index of the account to send STX from
   * @param to - The address to send STX to
   * @param amount - The amount of STX to send
   * @param network - The network to send STX on
   * @param memo - The memo to send with the STX
   * @returns The transaction ID of the STX send
   */
  async sendStx(
    accountIndex: number,
    to: string,
    amount: number,
    network: NetworkType,
    memo?: string
  ): Promise<string> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }

    const senderKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      accountIndex
    )

    const tx = await this.stacksClient.sendStx(
      senderKey,
      to,
      amount,
      network,
      memo
    )
    return tx
  }

  /**
   * Transfer an NFT to an address
   * @param accountIndex - The index of the account to transfer the NFT from
   * @param contractId - The ID of the contract to transfer the NFT from
   * @param tokenId - The ID of the NFT to transfer
   * @param to - The address to transfer the NFT to
   * @param network - The network to transfer the NFT on
   * @returns The transaction ID of the NFT transfer
   */
  async transferNFT(
    accountIndex: number,
    contractId: string,
    tokenId: string,
    to: string,
    network: NetworkType
  ): Promise<string> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }
    const senderKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      accountIndex
    )
    const senderAddress =
      network === NetworkType.Mainnet
        ? wallet.accounts[accountIndex].addresses.mainnet
        : wallet.accounts[accountIndex].addresses.testnet
    const tx = await this.stacksClient.transferNFT(
      contractId,
      tokenId,
      senderKey,
      senderAddress,
      to,
      network
    )
    return tx
  }

  /**
   * Transfer a fungible token to an address
   * @param accountIndex - The index of the account to transfer the fungible token from
   * @param contractId - The ID of the contract to transfer the fungible token from
   * @param amount - The amount of the fungible token to transfer
   * @param to - The address to transfer the fungible token to
   * @param network - The network to transfer the fungible token on
   * @returns The transaction ID of the fungible token transfer
   */
  async transferFT(
    accountIndex: number,
    contractId: string,
    amount: number,
    to: string,
    network: NetworkType
  ): Promise<string> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }
    const senderKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      accountIndex
    )
    const senderAddress =
      network === NetworkType.Mainnet
        ? wallet.accounts[accountIndex].addresses.mainnet
        : wallet.accounts[accountIndex].addresses.testnet
    const tx = await this.stacksClient.transferFT(
      contractId,
      amount,
      senderKey,
      senderAddress,
      to,
      network
    )
    return tx
  }

  /**
   * Login with Google
   * @returns The access token and whether the user has a backup
   */
  async loginWithGoogle(): Promise<{
    accessToken: string
    hasBackup: boolean
  }> {
    try {
      const accessToken = await this.authenticationManager.signIn()
      this.backupManager.updateAccessToken(accessToken)
      const hasBackup = await this.backupManager.hasWalletBackup()
      return {
        accessToken,
        hasBackup,
      }
    } catch (error) {
      if (error instanceof AccessTokenError) {
        const oldToken = this.backupManager.getAccessTokenFromClient()
        const newToken =
          await this.authenticationManager.getAccessToken(oldToken)
        this.backupManager.updateAccessToken(newToken)
        return this.loginWithGoogle()
      }

      throw error
    }
  }

  /**
   * Create a new wallet
   * @param passphrase - Optional passphrase for the wallet
   * @returns The wallet
   */
  async createWallet(passphrase?: string): Promise<Wallet> {
    const { wallet, mnemonic } =
      await this.walletManager.createWallet(passphrase)
    await this.storageManager.setItem('wallet', wallet)
    await this.storageManager.setItem('mnemonic', mnemonic)
    return wallet
  }

  /**
   * Backup the wallet
   * @param password - The password to backup the wallet with
   * @returns The transaction ID of the backup
   */
  async backupWallet(password: string): Promise<void> {
    try {
      const wallet = await this.storageManager.getItem<Wallet>('wallet')
      if (!wallet) {
        throw new WalletNotStoredError(
          'Wallet not found in local storage',
          'WALLET_NOT_FOUND'
        )
      }

      const mnemonic = await this.storageManager.getItem<string>('mnemonic')
      if (!mnemonic) {
        throw new WalletNotStoredError(
          'Mnemonic not found in local storage',
          'MNEMONIC_NOT_FOUND'
        )
      }
      const encryptedData = await this.encryptionManager.encryptWallet(
        password,
        wallet,
        mnemonic
      )
      const fingerprint = await getFingerPrintFromMnemonic(mnemonic)
      const envelope: WalletEnvelope = {
        version: 1,
        walletId: fingerprint,
        createdAt: new Date(),
        mnemonic: encryptedData.encryptedMnemonic,
        mnemonicNonce: encryptedData.mnemonicNonce,
        wallet: encryptedData.encryptedWallet,
        walletNonce: encryptedData.walletNonce,
        salt: encryptedData.salt,
        accountsCount: wallet.accounts.length,
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

      await this.backupManager.saveBackup(fingerprint, envelope)
    } catch (error) {
      if (error instanceof AccessTokenError) {
        return this.refreshTokenAndRetry(
          async () => await this.backupWallet(password)
        )
      }
      throw error
    }
  }

  /**
   * Retrieve a wallet from the backup
   * @param password - The password to retrieve the wallet with
   * @returns The wallet and mnemonic
   */
  async retrieveWallet(password: string): Promise<{
    wallet: Wallet
    mnemonic: string
  }> {
    try {
      const envelope: WalletEnvelope = await this.backupManager.retrieveBackup()
      const decryptedData = await this.encryptionManager.decryptWallet(
        password,
        envelope
      )
      await this.storageManager.setItem('wallet', decryptedData.wallet)
      await this.storageManager.setItem('mnemonic', decryptedData.mnemonic)
      return {
        wallet: decryptedData.wallet,
        mnemonic: decryptedData.mnemonic,
      }
    } catch (error) {
      if (error instanceof AccessTokenError) {
        return this.refreshTokenAndRetry(
          async () => await this.retrieveWallet(password)
        )
      }
      throw error
    }
  }

  /**
   * Sign out of the wallet
   * @returns The transaction ID of the sign out
   */
  async signOut(): Promise<void> {
    try {
      await this.authenticationManager.signOut()
      await this.storageManager.clear()
      this.backupManager.updateAccessToken('')
    } catch (error) {
      if (error instanceof AccessTokenError) {
        return this.refreshTokenAndRetry(async () => await this.signOut())
      }
      throw error
    }
  }

  /**
   * Delete the backup of the wallet
   * @param password - The password to delete the backup with
   * @returns The transaction ID of the backup deletion
   */
  async deleteBackup(password: string): Promise<void> {
    try {
      const mnemonic = await this.storageManager.getItem<string>('mnemonic')
      if (!mnemonic) {
        throw new WalletNotStoredError(
          'Mnemonic not found in local storage',
          'MNEMONIC_NOT_FOUND'
        )
      }
      const backupFileName = await getFingerPrintFromMnemonic(mnemonic)
      await this.backupManager.deleteBackup(backupFileName)
    } catch (error) {
      if (error instanceof AccessTokenError) {
        return this.refreshTokenAndRetry(
          async () => await this.deleteBackup(password)
        )
      }
      throw error
    }
  }

  /**
   * Get the accounts in the wallet
   * @returns The accounts in the wallet
   */
  async getWalletAccounts(): Promise<WalletAccount[]> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      return []
    }
    return wallet.accounts
  }

  /**
   * Get the balance of an account
   * @param account - The account to get the balance of
   * @returns The balance of the account
   */
  async getBalance(Account: WalletAccount): Promise<number> {
    return await this.stacksClient.getBalance(Account)
  }

  /**
   * Delete the backup of the wallet without a password
   * @returns The transaction ID of the backup deletion
   */
  async deleteBackupWithoutPassword(): Promise<void> {
    try {
      await this.backupManager.deleteExistingBackup()
    } catch (error) {
      if (error instanceof AccessTokenError) {
        return this.refreshTokenAndRetry(
          async () => await this.deleteBackupWithoutPassword()
        )
      }
      throw error
    }
  }

  /**
   * Stack STX to a stacking pool
   * @param account - The account to stack STX to
   * @param amount - The amount of STX to stack
   * @param lockPeriod - The lock period to stack STX for
   * @param maxAmount - The maximum amount of STX to stack
   * @param options - The options for the STX stacking if not provided, the signature options will be generated by a dedicated backend service for mainnet and testnet networks.
   * @param options.signerSignature - The signature of the signer (optional)
   * @param options.signerKey - The key of the signer (optional)
   * @param options.authId - The auth ID of the signer (optional)
   * @returns The transaction ID of the STX stacking
   */
  async stackSTX(
    account: WalletAccount,
    amount: number,
    lockPeriod: number,
    maxAmount: number,
    options?: {
      signerSignature: string
      signerKey: string
      authId: string
    }
  ): Promise<string> {
    const { minimumThreshold, currentBurnHeight, currentRewardCycle } =
      await this.stacksClient.getPoxData()
    const balance = await this.stacksClient.getBalance(account)
    if (
      balance < minimumThreshold / 1000000 ||
      amount < minimumThreshold / 1000000
    ) {
      throw new MinimumThresholdNotMetError()
    }
    if (balance < amount) {
      throw new InvalidAmountError()
    }
    if (amount > maxAmount) {
      throw new MaxAmountSmallerThanAmountError()
    }
    if (maxAmount > balance) {
      throw new MaxAmountGreaterThanBalanceError()
    }
    if (lockPeriod > 12 || lockPeriod < 1) {
      throw new InvalidLockPeriod()
    }
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }
    const senderPrivateKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      account.index
    )
    const btcAddresses = await getBitcoinAddressesFromStacksWallet(
      HDKey.fromExtendedKey(wallet.privateKey),
      account.index
    )
    const txId = await this.stackingClient.stackStx(
      senderPrivateKey,
      currentRewardCycle,
      amount,
      btcAddresses,
      currentBurnHeight,
      lockPeriod,
      maxAmount,
      options
    )
    return txId
  }

  private async refreshTokenAndRetry<T>(
    operation: () => Promise<T>
  ): Promise<T> {
    const oldToken = this.backupManager.getAccessTokenFromClient()
    if (!oldToken) {
      const token = await this.authenticationManager.signInSilently()
      this.backupManager.updateAccessToken(token)
    } else {
      const newToken = await this.authenticationManager.getAccessToken(oldToken)

      this.backupManager.updateAccessToken(newToken)
    }
    return operation()
  }
}
