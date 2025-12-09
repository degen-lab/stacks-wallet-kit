import {
  BackupManager,
  BaseClient,
  EncryptionManager,
  GoogleBackupClient,
  IStorageManager,
  StackingClient,
  STACKS_API_BASE_URL,
  STACKS_TESTNET_API_BASE_URL,
  StacksClient,
  NetworkType,
  WalletManager,
  STACKS_MOBILE_DEVNET_API_BASE_URL,
} from '@degenlab/stacks-wallet-kit-core'
import { GoogleAuth } from '../auth/googleAuth'
import { StorageFactory } from '../storage/storageFactory'

/**
 *
 * @param webClientId - The web client ID
 * @param iosClientId - The iOS client ID
 * @param network - The network to use
 * @param scopes - Optional additional OAuth scopes. The default scope 'https://www.googleapis.com/auth/drive.appdata' is always included and will be merged with any additional scopes you provide
 * @param storageManager - Optional custom storage manager. If not provided, defaults to SecureStore for Expo or KeyChainStorage for React Native
 * @param stacksConfig - Optional Stacks API configuration. Defaults to the following URLs:
 * - mainnetUrl: https://api.hiro.so/
 * - testnetUrl: https://api.testnet.hiro.so/
 * - devnetUrl: http://10.0.2.2:3999/ (emulator compatible)
 */
export class MobileClient extends BaseClient {
  constructor(
    webClientId: string,
    iosClientId: string,
    network: NetworkType,
    configOptions?: {
      scopes?: string[]
      storageManager?: IStorageManager
      mainnetUrl?: string
      testnetUrl?: string
      devnetUrl?: string
    }
  ) {
    const mainnetBaseUrl = configOptions?.mainnetUrl || STACKS_API_BASE_URL
    const testnetBaseUrl =
      configOptions?.testnetUrl || STACKS_TESTNET_API_BASE_URL
    const devnetBaseUrl =
      configOptions?.devnetUrl || STACKS_MOBILE_DEVNET_API_BASE_URL

    const authenticationManager = new GoogleAuth(
      webClientId,
      iosClientId,
      configOptions?.scopes
    )
    const backupClient = new GoogleBackupClient()
    const backupManager = new BackupManager(backupClient)
    const walletManager = new WalletManager()
    const encryptionManager = new EncryptionManager()
    const dataManager = configOptions?.storageManager
      ? configOptions.storageManager
      : StorageFactory.getInstance()
    const stacksClient = new StacksClient(
      network,
      mainnetBaseUrl,
      testnetBaseUrl,
      devnetBaseUrl
    )
    const stackingClient = new StackingClient(network, devnetBaseUrl)
    super(
      authenticationManager,
      backupManager,
      walletManager,
      encryptionManager,
      dataManager,
      stacksClient,
      stackingClient
    )
  }
}
