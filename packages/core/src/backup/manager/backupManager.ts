import {
  IBackupManager,
  IGoogleBackupClient,
  WalletEnvelope,
} from '../../shared'
import {
  BackupAlreadyExistsError,
  BackupNotFoundError,
} from '../../shared/errors/backupErrors'

export class BackupManager implements IBackupManager {
  private backupClient: IGoogleBackupClient

  constructor(backupClient: IGoogleBackupClient) {
    this.backupClient = backupClient
  }

  getAccessTokenFromClient(): string {
    return this.backupClient.getAccessToken()
  }

  async hasWalletBackup(): Promise<boolean> {
    const result = await this.backupClient.findAll()
    const data = result.find(
      (value) => value.appProperties?.walletName === 'Google-Wallet'
    )
    if (data?.id) {
      return true
    }
    return false
  }

  updateAccessToken(newToken: string): void {
    this.backupClient.setAccessToken(newToken)
  }

  async saveBackup(name: string, envelope: WalletEnvelope): Promise<void> {
    const result = await this.backupClient.findAll()

    const data = result.find(
      (value) => value.appProperties?.walletName === 'Google-Wallet'
    )
    if (data?.id) {
      throw new BackupAlreadyExistsError()
    }

    await this.backupClient.upload(name, envelope, {
      walletName: 'Google-Wallet',
    })
  }

  async deleteBackup(backupId: string): Promise<void> {
    const result = await this.backupClient.findOne(backupId)
    if (!result?.id) {
      throw new BackupNotFoundError()
    }
    await this.backupClient.delete(result.id)
  }

  async deleteExistingBackup(): Promise<void> {
    const result = await this.backupClient.findAll()
    const data = result.find(
      (value) => value.appProperties?.walletName === 'Google-Wallet'
    )
    if (!data?.id) {
      throw new BackupNotFoundError()
    }
    await this.backupClient.delete(data.id)
  }

  async getBackup(backupId: string): Promise<WalletEnvelope> {
    const result = await this.backupClient.findOne(backupId)
    if (!result?.id) {
      throw new BackupNotFoundError()
    }
    const envelope = await this.backupClient.download(result.id)
    return envelope
  }

  async retrieveBackup(): Promise<WalletEnvelope> {
    const result = await this.backupClient.findAll()
    const data = result.find(
      (value) => value.appProperties?.walletName === 'Google-Wallet'
    )
    if (!data?.id) {
      throw new BackupNotFoundError()
    }
    const envelope = await this.backupClient.download(data.id)
    return envelope
  }
}
