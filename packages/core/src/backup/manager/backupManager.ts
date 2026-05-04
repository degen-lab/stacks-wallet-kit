import {
  AuthProvider,
  BackupWriteResult,
  IBackupManager,
  IBackupProvider,
  WalletEnvelope,
} from '../../shared'
import {
  BackupProviderNotRegisteredError,
  BackupWriteFailedError,
} from '../../shared/errors/backupErrors'

export class BackupManager implements IBackupManager {
  private providers = new Map<AuthProvider, IBackupProvider>()

  registerProvider(provider: IBackupProvider): void {
    this.providers.set(provider.provider, provider)
  }

  getProvider(provider: AuthProvider): IBackupProvider | undefined {
    return this.providers.get(provider)
  }

  async listAvailable(): Promise<AuthProvider[]> {
    const available: AuthProvider[] = []
    for (const [provider, backupProvider] of this.providers) {
      if (await backupProvider.isAvailable()) {
        available.push(provider)
      }
    }
    return available
  }

  async hasBackup(provider: AuthProvider): Promise<boolean> {
    return this.requireProvider(provider).hasBackup()
  }

  async saveToTargets(
    envelope: WalletEnvelope,
    targets: AuthProvider[]
  ): Promise<BackupWriteResult> {
    const writes = await Promise.all(
      targets.map(async (provider) => {
        try {
          await this.requireProvider(provider).save(envelope)
          return { provider, error: null as unknown }
        } catch (error) {
          return { provider, error }
        }
      })
    )

    const succeeded = writes
      .filter((w) => w.error === null)
      .map((w) => w.provider)
    const failed = writes
      .filter((w) => w.error !== null)
      .map((w) => ({ provider: w.provider, error: w.error }))

    if (succeeded.length === 0) {
      throw new BackupWriteFailedError(failed)
    }

    return { succeeded, failed }
  }

  async retrieveFrom(provider: AuthProvider): Promise<WalletEnvelope> {
    return this.requireProvider(provider).retrieve()
  }

  async deleteFrom(provider: AuthProvider): Promise<void> {
    await this.requireProvider(provider).delete()
  }

  private requireProvider(provider: AuthProvider): IBackupProvider {
    const backupProvider = this.providers.get(provider)
    if (!backupProvider) {
      throw new BackupProviderNotRegisteredError(
        `Backup provider "${provider}" is not registered`
      )
    }
    return backupProvider
  }
}
