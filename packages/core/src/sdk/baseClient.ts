import {
  AuthProvider,
  AuthenticatedUser,
  BackupWriteResult,
  GoogleAuthenticatedUser,
  IAccessTokenBackupProvider,
  IAuthentication,
  IBackupManager,
  ISilentSignInCapable,
  ITokenRefreshCapable,
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
import {
  AccessTokenError,
  BackupProviderNotRegisteredError,
  BackupWriteFailedError,
} from '../shared/errors/backupErrors'
import { AuthProviderNotRegisteredError } from '../shared/errors/authErrors'
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
import {
  ClarityValue,
  PostConditionMode,
  StacksTransactionWire,
} from '@stacks/transactions'

export class BaseClient implements ISDKFacade {
  protected authenticationManagers: Map<AuthProvider, IAuthentication>

  protected accessTokenBackupProviders: Map<
    AuthProvider,
    IAccessTokenBackupProvider
  >

  constructor(
    authenticationManagers: Map<AuthProvider, IAuthentication>,
    protected backupManager: IBackupManager,
    protected walletManager: IWalletManager,
    protected encryptionManager: IEncryptionManager,
    protected storageManager: IStorageManager,
    protected stacksClient: IStacksClient,
    protected stackingClient: IStackingClient,
    accessTokenBackupProviders?: Map<AuthProvider, IAccessTokenBackupProvider>
  ) {
    this.authenticationManagers = authenticationManagers
    this.accessTokenBackupProviders = accessTokenBackupProviders ?? new Map()
  }

  async signIn(provider: AuthProvider): Promise<{ user: AuthenticatedUser }> {
    return {
      user: await this.signInWithProvider(provider),
    }
  }

  async getBackupAvailability(provider: AuthProvider): Promise<boolean> {
    try {
      const backupProvider = this.backupManager.getProvider(provider)
      if (!backupProvider) {
        return false
      }
      return await backupProvider.isAvailable()
    } catch (error) {
      if (error instanceof AccessTokenError) {
        try {
          return await this.refreshTokenAndRetry(provider, async () => {
            const backupProvider = this.backupManager.getProvider(provider)
            return backupProvider ? backupProvider.isAvailable() : false
          })
        } catch {
          return false
        }
      }
      return false
    }
  }

  async hasBackup(provider: AuthProvider = 'google'): Promise<boolean> {
    try {
      return await this.withAccessTokenRetry(provider, () =>
        this.backupManager.hasBackup(provider)
      )
    } catch (error) {
      if (error instanceof BackupProviderNotRegisteredError) {
        return false
      }
      throw error
    }
  }

  /**
   * @deprecated Use `signIn('google')` and `hasBackup('google')` instead.
   */
  async loginWithGoogle(): Promise<{
    accessToken: string
    idToken: string
    hasBackup: boolean
    userData: GoogleAuthenticatedUser
  }> {
    const { user } = await this.signIn('google')
    if (user.provider !== 'google') {
      throw new AuthProviderNotRegisteredError(
        'Authentication provider "google" returned a non-Google user'
      )
    }
    return {
      accessToken: user.credentials.accessToken,
      idToken: user.credentials.idToken ?? '',
      hasBackup: await this.hasBackup('google'),
      userData: user,
    }
  }

  /**
   * Sign a prepared Stacks transaction using an account-derived private key.
   * @param accountIndex - Index of the wallet account to use for signing
   * @param transaction - Unsigned transaction payload to be signed
   * @returns Signed transaction ready for broadcast
   * @throws WalletNotStoredError if no wallet is available in storage
   */
  async signTransaction(
    accountIndex: number,
    transaction: StacksTransactionWire
  ): Promise<StacksTransactionWire> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }
    const privateKey = derivePrivateKey(
      HDKey.fromExtendedKey(wallet.privateKey),
      accountIndex
    )

    return this.stacksClient.signTranasction(transaction, privateKey)
  }

  /**
   * Make a contract call to the Stacks network
   * @param contractAddress - The address of the contract to call
   * @param functionName - The name of the function to call
   * @param functionArgs - The arguments to pass to the function
   * @param postConditionMode - Optional post condition mode (defaults to PostConditionMode.Deny)
   * @param fee - Optional custom transaction fee in microSTX
   * @param accountIndex - Index of the wallet account to sign with (defaults to 0)
   * @returns The transaction ID of the contract call
   */
  async makeContractCall(
    contractAddress: string,
    functionName: string,
    functionArgs: ClarityValue[],
    postConditionMode?: PostConditionMode,
    fee?: number,
    accountIndex: number = 0
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
    const [address, contractName] = contractAddress.split('.')
    return await this.stacksClient.makeContractCall(
      address,
      contractName,
      functionName,
      functionArgs,
      senderKey,
      postConditionMode,
      fee
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

  async backupWallet(
    password: string,
    targets: AuthProvider[] = ['google']
  ): Promise<BackupWriteResult> {
    const envelope = await this.createBackupEnvelope(password)

    try {
      return await this.backupManager.saveToTargets(envelope, targets)
    } catch (error) {
      if (
        error instanceof BackupWriteFailedError &&
        error.failures.length === 1 &&
        targets.length === 1 &&
        error.failures[0].provider === targets[0] &&
        error.failures[0].error instanceof AccessTokenError
      ) {
        return this.refreshTokenAndRetry(targets[0], () =>
          this.backupManager.saveToTargets(envelope, targets)
        )
      }

      throw error
    }
  }

  async retrieveWalletFromProvider(
    password: string,
    provider: AuthProvider
  ): Promise<{
    wallet: Wallet
    mnemonic: string
  }> {
    const envelope = await this.withAccessTokenRetry(provider, () =>
      this.backupManager.retrieveFrom(provider)
    )
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
  }

  /**
   * @deprecated Use `retrieveWalletFromProvider(password, 'google')` instead.
   */
  async retrieveWallet(password: string): Promise<{
    wallet: Wallet
    mnemonic: string
  }> {
    return this.retrieveWalletFromProvider(password, 'google')
  }

  async signOut(): Promise<void> {
    for (const [provider, authenticationManager] of this
      .authenticationManagers) {
      await authenticationManager.signOut()
      this.clearProviderAccessToken(provider)
    }

    await this.storageManager.clear()
  }

  async deleteBackup(provider: AuthProvider = 'google'): Promise<void> {
    await this.withAccessTokenRetry(provider, () =>
      this.backupManager.deleteFrom(provider)
    )
  }

  /**
   * @deprecated Use `deleteBackup('google')` instead.
   */
  async deleteBackupWithoutPassword(): Promise<void> {
    await this.deleteBackup('google')
  }

  async getWalletAccounts(): Promise<WalletAccount[]> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      return []
    }
    return wallet.accounts
  }

  async getBalance(account: WalletAccount): Promise<number> {
    return await this.stacksClient.getBalance(account)
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

  protected async refreshTokenAndRetry<T>(
    operation: () => Promise<T>
  ): Promise<T>

  protected async refreshTokenAndRetry<T>(
    provider: AuthProvider,
    operation: () => Promise<T>
  ): Promise<T>

  protected async refreshTokenAndRetry<T>(
    providerOrOperation: AuthProvider | (() => Promise<T>),
    maybeOperation?: () => Promise<T>
  ): Promise<T> {
    const provider =
      typeof providerOrOperation === 'function' ? 'google' : providerOrOperation
    const operation =
      typeof providerOrOperation === 'function'
        ? providerOrOperation
        : maybeOperation

    if (!operation) {
      throw new AccessTokenError('Retry operation is missing')
    }

    const authenticationManager = this.getAuthenticationManager(provider)
    const oldToken = this.getProviderAccessToken(provider)
    if (oldToken && this.isTokenRefreshCapable(authenticationManager)) {
      const newToken = await authenticationManager.getAccessToken(oldToken)
      this.setProviderAccessToken(provider, newToken)
      return operation()
    }

    let tokenRefreshError: unknown
    if (this.isTokenRefreshCapable(authenticationManager)) {
      try {
        const newToken = await authenticationManager.getAccessToken()
        this.setProviderAccessToken(provider, newToken)
        return operation()
      } catch (error) {
        tokenRefreshError = error
      }
    }

    if (this.isSilentSignInCapable(authenticationManager)) {
      const user = await authenticationManager.signInSilently()
      const accessToken = this.getAuthenticatedAccessToken(user)
      if (!accessToken) {
        throw new AccessTokenError(
          `Provider "${provider}" did not return an access token`
        )
      }
      this.setProviderAccessToken(provider, accessToken)
      return operation()
    }

    if (tokenRefreshError) {
      throw tokenRefreshError
    }

    throw new AccessTokenError(
      `Provider "${provider}" does not support access token refresh`
    )
  }

  private async withAccessTokenRetry<T>(
    provider: AuthProvider,
    operation: () => Promise<T>
  ): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      if (error instanceof AccessTokenError) {
        return this.refreshTokenAndRetry(provider, operation)
      }
      throw error
    }
  }

  private getAuthenticationManager(provider: AuthProvider): IAuthentication {
    const authenticationManager = this.authenticationManagers.get(provider)
    if (!authenticationManager) {
      throw new AuthProviderNotRegisteredError(
        `Authentication provider "${provider}" is not registered`
      )
    }
    return authenticationManager
  }

  protected setProviderAccessToken(
    provider: AuthProvider,
    accessToken?: string
  ): void {
    if (!accessToken) {
      return
    }
    this.accessTokenBackupProviders.get(provider)?.setAccessToken(accessToken)
  }

  protected getProviderAccessToken(provider: AuthProvider): string {
    return this.accessTokenBackupProviders.get(provider)?.getAccessToken() ?? ''
  }

  protected clearProviderAccessToken(provider: AuthProvider): void {
    this.accessTokenBackupProviders.get(provider)?.setAccessToken('')
  }

  private async getStoredWalletAndMnemonic(): Promise<{
    wallet: Wallet
    mnemonic: string
  }> {
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

    return { wallet, mnemonic }
  }

  private async createBackupEnvelope(
    password: string
  ): Promise<WalletEnvelope> {
    const { wallet, mnemonic } = await this.getStoredWalletAndMnemonic()
    const encryptedData = await this.encryptionManager.encryptWallet(
      password,
      wallet,
      mnemonic
    )

    return {
      version: 1,
      walletId: await getFingerPrintFromMnemonic(mnemonic),
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
  }

  protected isTokenRefreshCapable(
    authenticationManager: IAuthentication
  ): authenticationManager is IAuthentication & ITokenRefreshCapable {
    return 'getAccessToken' in authenticationManager
  }

  protected isSilentSignInCapable(
    authenticationManager: IAuthentication
  ): authenticationManager is IAuthentication & ISilentSignInCapable {
    return 'signInSilently' in authenticationManager
  }

  private async signInWithProvider(
    provider: AuthProvider
  ): Promise<AuthenticatedUser> {
    const authenticationManager = this.getAuthenticationManager(provider)
    const user = await authenticationManager.signIn()
    this.setProviderAccessToken(
      provider,
      this.getAuthenticatedAccessToken(user)
    )
    return user
  }

  private getAuthenticatedAccessToken(
    user: AuthenticatedUser
  ): string | undefined {
    return user.provider === 'google' ? user.credentials.accessToken : undefined
  }
}
