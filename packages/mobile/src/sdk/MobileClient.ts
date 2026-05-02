import {
  AuthProvider,
  BackupManager,
  BaseClient,
  EncryptionManager,
  GoogleBackupClient,
  IAccessTokenBackupProvider,
  IAuthentication,
  IStorageManager,
  NetworkType,
  STACKS_API_BASE_URL,
  STACKS_MOBILE_DEVNET_API_BASE_URL,
  STACKS_TESTNET_API_BASE_URL,
  StackingClient,
  StacksClient,
  Wallet,
  WalletManager,
  WalletNotStoredError,
} from '@degenlab/stacks-wallet-kit-core'
import { Platform } from 'react-native'
import { AppleAuth } from '../auth/appleAuth'
import { GoogleAuth } from '../auth/googleAuth'
import { CloudKitBackupClient } from '../backup/cloudKitBackupClient'
import { StorageFactory } from '../storage/storageFactory'

export type MobileClientConfig = {
  google?: {
    webClientId: string
    iosClientId: string
    scopes?: string[]
  }
  network: NetworkType
  storageManager?: IStorageManager
  mainnetUrl?: string
  testnetUrl?: string
  devnetUrl?: string
}

export class MobileClient extends BaseClient {
  /**
   * @param config.google.webClientId - The Google web client ID
   * @param config.google.iosClientId - The Google iOS client ID
   * @param config.network - The network to use
   * @param config.google.scopes - Optional additional OAuth scopes. The default scope 'https://www.googleapis.com/auth/drive.appdata' is always included and will be merged with any additional scopes you provide
   * @param config.storageManager - Optional custom storage manager. If not provided, defaults to SecureStore for Expo or KeyChainStorage for React Native
   * @param config.mainnetUrl - Defaults to https://api.hiro.so/
   * @param config.testnetUrl - Defaults to https://api.testnet.hiro.so/
   * @param config.devnetUrl - Defaults to http://10.0.2.2:3999/ (emulator compatible)
   */
  constructor(config: MobileClientConfig) {
    const mainnetBaseUrl = config.mainnetUrl ?? STACKS_API_BASE_URL
    const testnetBaseUrl = config.testnetUrl ?? STACKS_TESTNET_API_BASE_URL
    const devnetBaseUrl = config.devnetUrl ?? STACKS_MOBILE_DEVNET_API_BASE_URL

    const authenticationManagers = new Map<AuthProvider, IAuthentication>()
    const accessTokenBackupProviders = new Map<
      AuthProvider,
      IAccessTokenBackupProvider
    >()
    const backupManager = new BackupManager()
    const walletManager = new WalletManager()
    const encryptionManager = new EncryptionManager()
    const storage = config.storageManager ?? StorageFactory.getInstance()

    if (config.google) {
      const googleBackupClient = new GoogleBackupClient()
      authenticationManagers.set(
        'google',
        new GoogleAuth(
          config.google.webClientId,
          config.google.iosClientId,
          config.google.scopes
        )
      )
      backupManager.registerProvider(googleBackupClient)
      accessTokenBackupProviders.set('google', googleBackupClient)
    }

    if (Platform.OS === 'ios') {
      authenticationManagers.set('apple', new AppleAuth())
      backupManager.registerProvider(new CloudKitBackupClient())
    }

    super(
      authenticationManagers,
      backupManager,
      walletManager,
      encryptionManager,
      storage,
      new StacksClient(
        config.network,
        mainnetBaseUrl,
        testnetBaseUrl,
        devnetBaseUrl
      ),
      new StackingClient(config.network, devnetBaseUrl),
      accessTokenBackupProviders
    )
  }

  /**
   * Retrieve the stored mnemonic phrase from secure storage.
   * @returns The mnemonic phrase if found, null otherwise
   */
  async getMnemonic(): Promise<string | null> {
    return this.storageManager.getItem('mnemonic')
  }

  /**
   * Remove an account from the wallet by its account index property.
   * The wallet is automatically updated in storage after the account is removed.
   * The deleted index is tracked and will be reused when creating new accounts.
   * @param accountIndex - The index property of the account to remove (account.index)
   * @throws WalletNotStoredError if no wallet is available in storage
   * @throws Error if account with the specified index is not found
   */
  async removeWalletAccount(accountIndex: number): Promise<void> {
    const wallet = await this.storageManager.getItem<Wallet>('wallet')
    if (!wallet) {
      throw new WalletNotStoredError(
        'Wallet not found in local storage',
        'WALLET_NOT_FOUND'
      )
    }

    const arrayIndex = wallet.accounts.findIndex(
      (acc) => acc.index === accountIndex
    )
    if (arrayIndex === -1) {
      throw new Error(`Account with index ${accountIndex} not found in wallet`)
    }

    wallet.deletedIndices = [
      ...(wallet.deletedIndices ?? []),
      accountIndex,
    ].sort((a, b) => a - b)
    wallet.accounts.splice(arrayIndex, 1)
    await this.storageManager.setItem<Wallet>('wallet', wallet)
  }
}
