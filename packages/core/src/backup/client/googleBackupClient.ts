import {
  GoogleDriveBackupEntry,
  IGoogleBackupClient,
  WalletEnvelope,
} from '../../shared'
import {
  AccessTokenError,
  GoogleApiError,
} from '../../shared/errors/backupErrors'
import {
  DOWNLOAD_API_ENDPOINT,
  DRIVE_API_BASE,
  DRIVE_UPLOAD_BASE,
} from '../utils/constants'
import { buildMultipartBody, googleApiRequest } from '../utils/googleApiRequest'

export class GoogleBackupClient implements IGoogleBackupClient {
  private accessToken: string

  constructor(accessToken?: string) {
    this.accessToken = accessToken || ''
  }

  getAccessToken(): string {
    return this.accessToken
  }

  setAccessToken(newToken: string): void {
    this.accessToken = newToken
  }

  async upload(
    name: string,
    envelope: WalletEnvelope,
    appProperties?: Record<string, string | null | undefined>
  ): Promise<void> {
    try {
      const metadata = {
        name,
        parents: ['appDataFolder'],
        ...(appProperties ? { appProperties } : {}),
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
      if (error instanceof AccessTokenError) {
        throw error
      }
      throw new GoogleApiError()
    }
  }

  async findOne(name: string): Promise<GoogleDriveBackupEntry | null> {
    try {
      const result = await googleApiRequest<{
        files: GoogleDriveBackupEntry[] | null
      }>(DRIVE_API_BASE, 'files', {
        token: this.accessToken,
        query: {
          spaces: 'appDataFolder',
          q: `name='${name}'`,
          fields: 'files(id, name, appProperties, properties)',
        },
      })
      return result.files?.[0] || null
    } catch (error) {
      if (error instanceof AccessTokenError) {
        throw error
      }
      throw new GoogleApiError()
    }
  }

  async findAll(): Promise<GoogleDriveBackupEntry[] | []> {
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

      return result.files ? result.files : []
    } catch (error) {
      if (error instanceof AccessTokenError) {
        throw error
      }
      throw new GoogleApiError()
    }
  }

  async delete(fileId: string): Promise<void> {
    try {
      await googleApiRequest(DRIVE_API_BASE, `files/${fileId}`, {
        method: 'DELETE',
        token: this.accessToken,
      })
    } catch (error) {
      if (error instanceof AccessTokenError) {
        throw error
      }
      throw new GoogleApiError()
    }
  }

  async download(fileId: string): Promise<WalletEnvelope> {
    try {
      const result = await fetch(DOWNLOAD_API_ENDPOINT(fileId), {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      })

      if (!result.ok) {
        if (result.status === 401) {
          throw new AccessTokenError()
        }
        throw new GoogleApiError()
      }

      const wallet: WalletEnvelope = await result.json()
      return wallet
    } catch (error) {
      if (error instanceof AccessTokenError) {
        throw error
      }
      throw new GoogleApiError()
    }
  }
}
