import { AuthProvider } from '../types/authTypes'
import { WalletEnvelope } from '../types/backupTypes'

export interface IBackupProvider {
  readonly provider: AuthProvider
  isAvailable(): Promise<boolean>
  hasBackup(): Promise<boolean>
  save(envelope: WalletEnvelope): Promise<void>
  retrieve(): Promise<WalletEnvelope>
  delete(): Promise<void>
}

export interface IAccessTokenBackupProvider extends IBackupProvider {
  getAccessToken(): string
  setAccessToken(token: string): void
}
