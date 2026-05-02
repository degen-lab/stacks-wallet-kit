import {
  AuthProvider,
  GoogleDriveBackupEntry,
  IAccessTokenBackupProvider,
  WalletEnvelope,
} from '../../shared'
import {
  AccessTokenError,
  BackupNotFoundError,
  GoogleApiError,
} from '../../shared/errors/backupErrors'
import {
  DOWNLOAD_API_ENDPOINT,
  DRIVE_API_BASE,
  DRIVE_UPLOAD_BASE,
} from '../utils/constants'
import { buildMultipartBody, googleApiRequest } from '../utils/googleApiRequest'

const WALLET_NAME = 'Google-Wallet'
const BACKUP_KIND = 'stacks-wallet-kit'

export class GoogleBackupClient implements IAccessTokenBackupProvider {
  readonly provider: AuthProvider = 'google'

  private accessToken: string

  constructor(accessToken?: string) {
    this.accessToken = accessToken ?? ''
  }

  getAccessToken(): string {
    return this.accessToken
  }

  setAccessToken(token: string): void {
    this.accessToken = token
  }

  async isAvailable(): Promise<boolean> {
    return this.accessToken !== ''
  }

  async hasBackup(): Promise<boolean> {
    const entry = await this.findBackupEntry()
    return entry !== null
  }

  async save(envelope: WalletEnvelope): Promise<void> {
    const existing = await this.findBackupEntry()
    if (existing?.id) {
      await this.updateFile(existing.id, envelope)
    } else {
      await this.createFile(envelope)
    }
  }

  async retrieve(): Promise<WalletEnvelope> {
    const entry = await this.findBackupEntry()
    if (!entry?.id) {
      throw new BackupNotFoundError()
    }
    return this.downloadFile(entry.id)
  }

  async delete(): Promise<void> {
    const entry = await this.findBackupEntry()
    if (!entry?.id) {
      throw new BackupNotFoundError()
    }
    await this.deleteFile(entry.id)
  }

  private async findBackupEntry(): Promise<GoogleDriveBackupEntry | null> {
    const files = await this.listAllFiles()
    const matches = files.filter((f) => this.isWalletKitBackup(f))
    return matches.find((f) => f.name === WALLET_NAME) ?? matches[0] ?? null
  }

  private isWalletKitBackup(file: GoogleDriveBackupEntry): boolean {
    return (
      file.appProperties?.backupKind === BACKUP_KIND ||
      file.appProperties?.walletName === WALLET_NAME
    )
  }

  private async listAllFiles(): Promise<GoogleDriveBackupEntry[]> {
    try {
      const result = await googleApiRequest<{
        files: GoogleDriveBackupEntry[] | null
      }>(DRIVE_API_BASE, 'files', {
        token: this.accessToken,
        query: {
          spaces: 'appDataFolder',
          fields: 'files(id, name, appProperties, properties)',
        },
      })
      return result.files ?? []
    } catch (error) {
      if (error instanceof AccessTokenError) throw error
      throw new GoogleApiError()
    }
  }

  private async createFile(envelope: WalletEnvelope): Promise<void> {
    try {
      const metadata = {
        name: WALLET_NAME,
        parents: ['appDataFolder'],
        appProperties: { walletName: WALLET_NAME, backupKind: BACKUP_KIND },
      }
      const { body, contentType } = buildMultipartBody(metadata, envelope)
      await googleApiRequest(DRIVE_UPLOAD_BASE, 'files', {
        method: 'POST',
        token: this.accessToken,
        query: { uploadType: 'multipart' },
        headers: { 'Content-Type': contentType },
        body,
      })
    } catch (error) {
      if (error instanceof AccessTokenError) throw error
      throw new GoogleApiError()
    }
  }

  private async updateFile(
    fileId: string,
    envelope: WalletEnvelope
  ): Promise<void> {
    try {
      const { body, contentType } = buildMultipartBody(
        {
          name: WALLET_NAME,
          appProperties: { walletName: WALLET_NAME, backupKind: BACKUP_KIND },
        },
        envelope
      )
      await googleApiRequest(DRIVE_UPLOAD_BASE, `files/${fileId}`, {
        method: 'PATCH',
        token: this.accessToken,
        query: { uploadType: 'multipart' },
        headers: { 'Content-Type': contentType },
        body,
      })
    } catch (error) {
      if (error instanceof AccessTokenError) throw error
      throw new GoogleApiError()
    }
  }

  private async deleteFile(fileId: string): Promise<void> {
    try {
      await googleApiRequest(DRIVE_API_BASE, `files/${fileId}`, {
        method: 'DELETE',
        token: this.accessToken,
      })
    } catch (error) {
      if (error instanceof AccessTokenError) throw error
      throw new GoogleApiError()
    }
  }

  private async downloadFile(fileId: string): Promise<WalletEnvelope> {
    let res: Response
    try {
      res = await fetch(DOWNLOAD_API_ENDPOINT(fileId), {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      })
    } catch {
      throw new GoogleApiError()
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new AccessTokenError()
      throw new GoogleApiError()
    }

    return res.json() as Promise<WalletEnvelope>
  }
}
