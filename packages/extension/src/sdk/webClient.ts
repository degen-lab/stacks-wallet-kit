import {
  AuthProvider,
  BackupManager,
  BackupWriteResult,
  BaseClient,
  decryptData,
  encryptData,
  EncryptionManager,
  GoogleBackupClient,
  IAccessTokenBackupProvider,
  InvalidPasswordError,
  NetworkType,
  StackingClient,
  STACKS_API_BASE_URL,
  STACKS_TESTNET_API_BASE_URL,
  STACKS_WEB_DEVNET_API_BASE_URL,
  StacksClient,
  WalletManager,
} from '@degenlab/stacks-wallet-kit-core'
import { GoogleSigninClient } from '../authentication/googleSignInClient'
import { AuthenticationManager } from '../authentication/authenticationManager'
import { SCOPES } from '../utils/constants'
import { StorageManager } from '../storage/storageManager'
import { IWebStorageManager } from '@degenlab/stacks-wallet-kit-core'

/**
 *
 * @param googleClientId - The Google OAuth client ID
 * @param googleClientSecret - The Google OAuth client secret
 * @param redirectUri - The OAuth redirect URI
 * @param network - The network to use
 * @param configOptions - The configuration options
 * @param configOptions.scopes - The OAuth scopes
 * @param configOptions.storageManager - The storage manager (optional) it uses a custom storage manager that encrypts and decrypts the data in the browser storage.
 * @param configOptions.mainnetUrl - The mainnet API URL (optional) it uses hiro mainnet api by default
 * @param configOptions.testnetUrl - The testnet API URL (optional) it uses hiro testnet api by default
 * @param configOptions.devnetUrl - The devnet API URL (optional) it uses localhost:3999 by default
 */
export class WebClient extends BaseClient {
  constructor(
    googleClientId: string,
    googleClientSecret: string,
    redirectUri: string,
    network: NetworkType,
    configOptions?: {
      scopes?: string[]
      storageManager?: IWebStorageManager
      mainnetUrl?: string
      testnetUrl?: string
      devnetUrl?: string
    }
  ) {
    const mainnetBaseUrl = configOptions?.mainnetUrl || STACKS_API_BASE_URL
    const testnetBaseUrl =
      configOptions?.testnetUrl || STACKS_TESTNET_API_BASE_URL
    const devnetBaseUrl =
      configOptions?.devnetUrl || STACKS_WEB_DEVNET_API_BASE_URL
    const allScopes = configOptions?.scopes
      ? [...configOptions.scopes, ...SCOPES]
      : SCOPES
    const googleSignInClient = new GoogleSigninClient()
    const backupClient = new GoogleBackupClient()
    const accessTokenBackupProviders = new Map<
      AuthProvider,
      IAccessTokenBackupProvider
    >([['google', backupClient]])
    const stacksClient = new StacksClient(
      network,
      mainnetBaseUrl,
      testnetBaseUrl,
      devnetBaseUrl
    )
    const stackingClient = new StackingClient(network, devnetBaseUrl)

    const dataManager = configOptions?.storageManager
      ? configOptions.storageManager
      : new StorageManager(encryptData, decryptData)
    const authenticationManager = new AuthenticationManager(
      googleSignInClient,
      googleClientId,
      googleClientSecret,
      redirectUri,
      allScopes,
      dataManager
    )
    const encryptionManager = new EncryptionManager()
    const backupManager = new BackupManager()
    backupManager.registerProvider(backupClient)
    const walletManager = new WalletManager()
    super(
      new Map([['google', authenticationManager]]),
      backupManager,
      walletManager,
      encryptionManager,
      dataManager,
      stacksClient,
      stackingClient,
      accessTokenBackupProviders
    )
  }

  /**
   * Set the encryption password for the storage manager
   * @param password - The password to use for encrypting stored data
   * @throws Error if storage manager doesn't support password encryption
   */
  async setEncryptionPassword(password: string): Promise<void> {
    if ('setPassword' in this.storageManager) {
      const webStorageManager = this.storageManager as IWebStorageManager
      await webStorageManager.setPassword(password)
    } else {
      throw new Error(
        'Storage manager does not support password encryption. Use IWebStorageManager implementation.'
      )
    }
  }

  /**
   * Backup the wallet to Google Drive
   * Validates the encryption password matches before backing up
   * @param password - The password to backup the wallet with (must match the encryption password)
   * @throws InvalidPasswordError if the password doesn't match the encryption password
   */
  async backupWallet(
    password: string,
    targets: AuthProvider[] = ['google']
  ): Promise<BackupWriteResult> {
    if ('checkEncryptionPasswordMatches' in this.storageManager) {
      const webStorageManager = this.storageManager as IWebStorageManager
      const isPasswordValid =
        await webStorageManager.checkEncryptionPasswordMatches(password)
      if (!isPasswordValid) {
        throw new InvalidPasswordError()
      }
    }
    return super.backupWallet(password, targets)
  }
}
