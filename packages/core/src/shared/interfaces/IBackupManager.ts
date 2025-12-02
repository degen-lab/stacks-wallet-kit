import { WalletEnvelope } from '../types/backupTypes'

export interface IBackupManager {
  saveBackup(name: string, envelope: WalletEnvelope): Promise<void>
  deleteBackup(name: string): Promise<void>
  deleteExistingBackup(): Promise<void>
  hasWalletBackup(): Promise<boolean>
  getBackup(name: string): Promise<WalletEnvelope>
  retrieveBackup(): Promise<WalletEnvelope>
  updateAccessToken(newToken: string): void
  getAccessTokenFromClient(): string
}
