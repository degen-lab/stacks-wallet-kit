import {
  AuthProvider,
  CloudKitUnavailableError,
  IBackupProvider,
  WalletEnvelope,
} from '@degenlab/stacks-wallet-kit-core'

const WALLET_NAME_APPLE = 'Apple-Wallet'

type CloudKitNativeModule = {
  isAvailable(): Promise<boolean>
  save(
    walletId: string,
    envelopeJson: string,
    accountsCount: number
  ): Promise<void>
  find(walletId: string): Promise<boolean>
  download(walletId: string): Promise<string>
  delete(walletId: string): Promise<void>
}

export class CloudKitBackupClient implements IBackupProvider {
  readonly provider: AuthProvider = 'apple'

  private nativeModule?: CloudKitNativeModule

  async isAvailable(): Promise<boolean> {
    try {
      return await (await this.getNativeModule()).isAvailable()
    } catch {
      return false
    }
  }

  async hasBackup(): Promise<boolean> {
    try {
      return await (await this.getNativeModule()).find(WALLET_NAME_APPLE)
    } catch {
      return false
    }
  }

  async save(envelope: WalletEnvelope): Promise<void> {
    const nativeModule = await this.getNativeModule()
    await nativeModule.save(
      WALLET_NAME_APPLE,
      JSON.stringify(envelope),
      envelope.accountsCount
    )
  }

  async retrieve(): Promise<WalletEnvelope> {
    const nativeModule = await this.getNativeModule()
    return JSON.parse(await nativeModule.download(WALLET_NAME_APPLE))
  }

  async delete(): Promise<void> {
    await (await this.getNativeModule()).delete(WALLET_NAME_APPLE)
  }

  private async getNativeModule(): Promise<CloudKitNativeModule> {
    if (this.nativeModule) {
      return this.nativeModule
    }

    try {
      const { requireNativeModule } = await import('expo-modules-core')
      this.nativeModule =
        requireNativeModule<CloudKitNativeModule>('ExpoCloudKitBackup')
      return this.nativeModule
    } catch (error) {
      throw new CloudKitUnavailableError(
        'CloudKit native module is unavailable',
        'CLOUDKIT_UNAVAILABLE',
        error
      )
    }
  }
}
