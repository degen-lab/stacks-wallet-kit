import { IBackupProvider } from './IBackupProvider'
import { AuthProvider } from '../types/authTypes'
import { BackupWriteResult, WalletEnvelope } from '../types/backupTypes'

export interface IBackupManager {
  registerProvider(provider: IBackupProvider): void
  getProvider(provider: AuthProvider): IBackupProvider | undefined
  listAvailable(): Promise<AuthProvider[]>
  hasBackup(provider: AuthProvider): Promise<boolean>
  saveToTargets(
    envelope: WalletEnvelope,
    targets: AuthProvider[]
  ): Promise<BackupWriteResult>
  retrieveFrom(provider: AuthProvider): Promise<WalletEnvelope>
  deleteFrom(provider: AuthProvider): Promise<void>
}
