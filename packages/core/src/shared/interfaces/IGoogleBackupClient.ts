import { GoogleDriveBackupEntry, WalletEnvelope } from '../types/backupTypes'

export interface IGoogleBackupClient {
  upload(
    name: string,
    envelope: WalletEnvelope,
    appProperties?: Record<string, string | null | undefined>
  ): Promise<void>
  findOne(name: string): Promise<GoogleDriveBackupEntry | null>
  findAll(): Promise<GoogleDriveBackupEntry[] | []>
  delete(fileId: string): Promise<void>
  download(fileId: string): Promise<WalletEnvelope>
  setAccessToken(newToken: string): void
  getAccessToken(): string
}
